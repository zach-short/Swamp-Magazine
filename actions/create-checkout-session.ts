"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { dials } from "@/config/dials";
import { resolveOrderDraft, type ProductRow } from "@/lib/checkout/order-draft";
import { getSiteMode } from "@/lib/site-mode.server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// The order form (Lane F) builds against this signature. Contract is frozen so
// both lanes can run in parallel: prices and stock come from the DB server-side
// (never the client), the payment station mounts with the returned clientSecret
// (D2), and every failure is a literal-union reason the form can render in the
// mockups' voice.

export type DeliveryMethod = "pickup" | "shipping";

export type CreateCheckoutSessionInput = {
  slug: string;
  size: string;
  delivery: DeliveryMethod;
};

export type CreateCheckoutSessionResult =
  | { status: "success"; clientSecret: string; orderId: string }
  | {
      status: "error";
      reason:
        | "invalid-input"
        | "not-found"
        | "sold-out"
        | "stripe-unconfigured"
        | "server-error";
    };

const inputSchema = z.object({
  slug: z.string().min(1).max(200),
  size: z.string().min(1).max(20),
  delivery: z.enum(["pickup", "shipping"]),
});

const PRODUCT_SELECT =
  "id, slug, name, price_cents, active, product_variants(id, size, inventory_count)";

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", reason: "invalid-input" };
  }
  const { slug, size, delivery } = parsed.data;

  // The product page redirects when the site is not live, but a server action is
  // a public endpoint reachable by action id -- the page's gate does not cover
  // it. Without this, inventory staged during coming_soon (products default to
  // active) is purchasable by anyone holding an id from an earlier deploy, while
  // the storefront still says the drop has not opened. Same reason as the page:
  // an unreleased drop must not be reachable.
  if ((await getSiteMode()) !== "live") {
    return { status: "error", reason: "not-found" };
  }

  const stripe = getStripe();
  if (!stripe) {
    // Loud on purpose: the storefront silently refusing to sell is the worst
    // way to discover the key never made it into the environment.
    console.error(
      "[CHECKOUT] STRIPE_SECRET_KEY is unset -- refusing to create a session",
    );
    return { status: "error", reason: "stripe-unconfigured" };
  }

  try {
    const supabase = createAdminClient();

    // Read price and stock here, server-side, every time. Anything the client
    // sent about money is ignored by construction -- it never reaches Stripe.
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .maybeSingle();

    if (productError) {
      console.error("[CHECKOUT]", productError.code, productError.message);
      return { status: "error", reason: "server-error" };
    }

    const drafted = resolveOrderDraft(
      (product as ProductRow | null) ?? null,
      size,
      delivery,
    );
    if (drafted.status === "error") {
      return drafted;
    }
    const { draft } = drafted;

    // The order row is written before the Stripe session so a crash in between
    // leaves an abandoned pending order (harmless, sweepable) rather than a
    // paid session with nothing on our side to apply it to.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        status: "pending",
        delivery_method: draft.delivery,
        // What we quoted. amount_total_cents later records what Stripe actually
        // charged; storing both is what makes an underpayment auditable instead
        // of a number nobody can check.
        expected_amount_cents: draft.totalCents,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("[CHECKOUT]", orderError?.code, orderError?.message);
      return { status: "error", reason: "server-error" };
    }

    const orderId = order.id as string;

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: orderId,
      product_id: draft.productId,
      variant_id: draft.variantId,
      product_name: draft.productName,
      size: draft.size,
      unit_price_cents: draft.unitPriceCents,
      quantity: draft.quantity,
    });

    if (itemError) {
      console.error("[CHECKOUT]", itemError.code, itemError.message);
      return { status: "error", reason: "server-error" };
    }

    const session = await stripe.checkout.sessions.create({
      // "elements" is what older Stripe vocabulary called "custom": the session
      // is unchanged -- same line items, same completed webhook, same
      // return_url -- but the card step renders as our own components instead
      // of Stripe's iframe page. D2 asked for the card step on our domain and
      // named the Payment Element as one way to get it (DESIGN.md O2-A); this
      // is that way. "embedded_page" is still the recorded fallback.
      ui_mode: "elements",
      mode: "payment",
      // Under "elements" this is where confirm() lands the buyer, so the order
      // page keeps reading the session id out of the query string exactly as
      // it did under the iframe.
      return_url: `${await resolveOrigin()}/order?session_id={CHECKOUT_SESSION_ID}`,
      // The link the webhook trusts: written before the session id comes back,
      // so it exists even if storing that id fails.
      metadata: { order_id: orderId },
      payment_intent_data: { metadata: { order_id: orderId } },
      line_items: [
        {
          quantity: draft.quantity,
          // Inline price_data per BD-3 -- no Stripe Product catalog to drift
          // out of sync with ours.
          price_data: {
            currency: "usd",
            unit_amount: draft.unitPriceCents,
            product_data: { name: `${draft.productName} (${draft.size})` },
          },
        },
      ],
      // Naming the type at all turns off Stripe's dashboard-driven automatic
      // methods, which is the point: the founder's set is card plus the two
      // wallets, and Apple Pay / Google Pay ARE card under the hood. Anything
      // switched on in the dashboard later -- Link, Cash App, Klarna, Affirm --
      // cannot appear on the drop without a code change.
      payment_method_types: ["card"],
      automatic_tax: { enabled: dials.stripeTaxEnabled },
      ...(draft.delivery === "shipping"
        ? {
            shipping_address_collection: { allowed_countries: ["US" as const] },
            shipping_options: [
              {
                shipping_rate_data: {
                  type: "fixed_amount" as const,
                  display_name: "Flat rate shipping",
                  fixed_amount: {
                    amount: draft.shippingCents,
                    currency: "usd",
                  },
                },
              },
            ],
          }
        : {}),
    });

    if (!session.client_secret) {
      console.error("[CHECKOUT] session created without a client secret", session.id);
      return { status: "error", reason: "server-error" };
    }

    const { error: linkError } = await supabase
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderId);

    if (linkError) {
      // Not fatal: metadata.order_id already links the session back to this
      // order, and the RPC backfills the session id when it applies payment.
      console.error("[CHECKOUT]", linkError.code, linkError.message);
    }

    return { status: "success", clientSecret: session.client_secret, orderId };
  } catch (error) {
    console.error("[CHECKOUT]", error);
    return { status: "error", reason: "server-error" };
  }
}

// Stripe needs an absolute return URL. Deriving it from the request keeps
// localhost, Vercel previews, and production working without another env var to
// forget to set.
async function resolveOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
