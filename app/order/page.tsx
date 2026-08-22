import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrderConfirmedScreen } from "@/features/order";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe sends the buyer here with ?session_id=..., so there is nothing to
// cache and the session must be read per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ORDER — SWAMP MAGAZINE",
  // A confirmation page carries a live session id in its URL; keep it out of
  // search results.
  robots: { index: false, follow: false },
};

// searchParams is typed inline rather than through PageProps<"/order">: Next
// only regenerates .next/types on a build, so the generated union does not know
// about a route added since the last one and `bunx tsc --noEmit` would fail on
// a perfectly good page.
type OrderPageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const { session_id: sessionId } = await searchParams;

  if (typeof sessionId !== "string" || !sessionId) {
    redirect("/");
  }

  const stripe = getStripe();
  if (!stripe) {
    console.error("[ORDER] Stripe is not configured -- cannot confirm a session");
    redirect("/");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });

  // "open" means the payment was cancelled or failed and the session can still
  // be paid; sending them back to the storefront is the honest move, since the
  // embedded form lives on the product page.
  if (session.status !== "complete") {
    redirect("/");
  }

  const lineItems = (session.line_items?.data ?? []).map((item) => ({
    description: item.description ?? "",
    amountTotalCents: item.amount_total,
    quantity: item.quantity ?? 1,
  }));

  return (
    <OrderConfirmedScreen
      email={session.customer_details?.email ?? null}
      name={session.customer_details?.name ?? null}
      totalCents={session.amount_total ?? 0}
      delivery={await readDeliveryMethod(session.metadata?.order_id)}
      items={lineItems}
    />
  );
}

// The buyer can land here before the webhook has run, so this reads
// delivery_method -- written at session creation, not at payment -- rather than
// anything that waits on the webhook. Falls back to pickup, the free option, so
// a failed read never tells someone their shipped order will be waiting on
// campus.
async function readDeliveryMethod(
  orderId: string | undefined,
): Promise<"pickup" | "shipping"> {
  if (!orderId) return "pickup";
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select("delivery_method")
      .eq("id", orderId)
      .maybeSingle();
    if (error) {
      console.error("[ORDER]", error.code, error.message);
      return "pickup";
    }
    return data?.delivery_method === "shipping" ? "shipping" : "pickup";
  } catch (error) {
    console.error("[ORDER]", error);
    return "pickup";
  }
}
