import { Resend } from "resend";

import { OrderConfirmationEmail } from "@/emails/order-confirmation";
import { dials } from "@/config/dials";
import {
  handleStripeEvent,
  type ApplyCompletionInput,
  type CompletionOutcome,
} from "@/lib/checkout/checkout-completion";
import { serverEnv } from "@/lib/env/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe retries any non-2xx, so the status codes here are a protocol, not
// decoration: 400 for a signature we reject (retrying will not help), 500 only
// when a retry could genuinely succeed, 200 for everything we have decided
// about -- including events we ignore.

export async function POST(request: Request): Promise<Response> {
  const secret = serverEnv.stripeWebhookSecret;
  const stripe = getStripe();

  if (!secret || !stripe) {
    console.error("[STRIPE_WEBHOOK] Stripe is not configured -- event dropped");
    return new Response("stripe not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("missing signature", { status: 400 });
  }

  // The raw body must be read before anything parses it: signature verification
  // is over the exact bytes Stripe sent, and a JSON round-trip changes them
  // (PLAN.md P3 watch-for).
  const payload = await request.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    // An unverified body is untrusted input; log the failure, never the body.
    console.error(
      "[STRIPE_WEBHOOK] signature verification failed",
      error instanceof Error ? error.message : error,
    );
    return new Response("invalid signature", { status: 400 });
  }

  try {
    const action = await handleStripeEvent(event, {
      applyCompletion,
      sendConfirmation,
      refundOversold,
    });

    // Both of these mean money moved and we could not attach it to an order.
    // A 200 would retire the event into the logs; a 500 keeps it in Stripe's
    // failed-delivery list where someone will actually see it.
    if (action === "unlinked") {
      console.error(
        "[STRIPE_WEBHOOK] paid session carries no order_id metadata",
        event.id,
      );
      return new Response("unlinked payment", { status: 500 });
    }
    if (action === "order-not-found") {
      console.error(
        "[STRIPE_WEBHOOK] paid session references an order we do not have",
        event.id,
      );
      return new Response("order not found", { status: 500 });
    }

    return Response.json({ received: true, action });
  } catch (error) {
    // Let Stripe retry: the event id guard makes a redelivery safe.
    console.error("[STRIPE_WEBHOOK]", event.id, error);
    return new Response("handler error", { status: 500 });
  }
}

async function applyCompletion(
  input: ApplyCompletionInput,
): Promise<CompletionOutcome> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("apply_checkout_completion", {
    p_event_id: input.eventId,
    p_event_type: input.eventType,
    p_order_id: input.orderId,
    p_session_id: input.sessionId,
    p_payment_intent_id: input.paymentIntentId,
    p_amount_total_cents: input.amountTotalCents,
    p_customer_name: input.customerName,
    p_customer_email: input.customerEmail,
    p_customer_phone: input.customerPhone,
    p_shipping_address: input.shippingAddress ?? null,
  });

  if (error) {
    // Throwing (rather than returning an outcome) is deliberate: a failed apply
    // must not look like a completed one, and the 500 buys us Stripe's retry.
    console.error("[STRIPE_WEBHOOK] apply failed", error.code, error.message);
    throw new Error(`apply_checkout_completion failed: ${error.message}`);
  }

  const result = data as { outcome?: string; amount_mismatch?: boolean } | null;

  if (result?.amount_mismatch) {
    console.error(
      "[STRIPE_WEBHOOK] AMOUNT MISMATCH -- charged",
      input.amountTotalCents,
      "on order",
      input.orderId,
    );
  }

  // An unrecognised outcome must not fall through as a success: without this the
  // switch downstream returns undefined and the route answers 200, retiring an
  // event that was never applied.
  if (!isCompletionOutcome(result?.outcome)) {
    throw new Error(
      `apply_checkout_completion returned an unknown outcome: ${String(result?.outcome)}`,
    );
  }

  return result.outcome;
}

const OUTCOMES: readonly CompletionOutcome[] = [
  "applied",
  "already-applied",
  "oversold",
  "order-not-found",
];

function isCompletionOutcome(value: unknown): value is CompletionOutcome {
  return (
    typeof value === "string" &&
    (OUTCOMES as readonly string[]).includes(value)
  );
}

async function sendConfirmation(orderId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Claim the send before doing it. The conditional update is the lock: a
    // redelivered event finds confirmation_sent_at already set and skips, so the
    // buyer is never mailed twice. If the send then fails the claim is released,
    // which is what makes an un-sent email recoverable -- replaying the event
    // from the Stripe dashboard now re-enters this path instead of dead-ending.
    const { data: claimed, error: claimError } = await supabase
      .from("orders")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("confirmation_sent_at", null)
      .select("id");

    if (claimError) {
      console.error("[ORDER_EMAIL]", orderId, claimError.code, claimError.message);
      return;
    }
    if (!claimed || claimed.length === 0) {
      return;
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, delivery_method, customer_email, customer_name, amount_total_cents, order_items(product_name, size, unit_price_cents, quantity)",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      console.error("[ORDER_EMAIL]", orderId, error?.code, error?.message);
      await releaseConfirmationClaim(orderId);
      return;
    }
    if (!order.customer_email) {
      console.error("[ORDER_EMAIL] paid order has no customer email", orderId);
      await releaseConfirmationClaim(orderId);
      return;
    }

    const items = (order.order_items ?? []) as {
      product_name: string;
      size: string;
      unit_price_cents: number;
      quantity: number;
    }[];

    const resend = new Resend(serverEnv.resendApiKey);
    const { error: sendError } = await resend.emails.send({
      from: serverEnv.resendFrom,
      to: order.customer_email,
      subject: "SWAMP MAGAZINE: YOUR ORDER",
      react: OrderConfirmationEmail({
        orderId: order.id as string,
        customerName: order.customer_name as string | null,
        delivery: order.delivery_method === "shipping" ? "shipping" : "pickup",
        items: items.map((item) => ({
          name: item.product_name,
          size: item.size,
          unitPriceCents: item.unit_price_cents,
          quantity: item.quantity,
        })),
        totalCents: (order.amount_total_cents as number | null) ?? 0,
      }),
    });

    if (sendError) {
      console.error("[ORDER_EMAIL]", orderId, sendError);
      await releaseConfirmationClaim(orderId);
    }
  } catch (error) {
    // The payment and the decrement already committed; a dead mailer must not
    // undo them or trigger a Stripe retry that re-runs the whole handler. The
    // claim is released so replaying the event can still deliver the email.
    console.error("[ORDER_EMAIL]", orderId, error);
    await releaseConfirmationClaim(orderId);
  }
}

async function releaseConfirmationClaim(orderId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("orders")
      .update({ confirmation_sent_at: null })
      .eq("id", orderId);
    if (error) {
      console.error(
        "[ORDER_EMAIL] could not release the send claim -- this order will not",
        "be mailed on a replay:",
        orderId,
        error.message,
      );
    }
  } catch (error) {
    console.error("[ORDER_EMAIL] releasing the send claim failed", orderId, error);
  }
}

async function refundOversold({
  orderId,
  paymentIntentId,
}: {
  orderId: string;
  paymentIntentId: string | null;
}): Promise<void> {
  // Stock is checked at session creation, so this only fires when two buyers
  // raced the last unit. The dial says refund and apologize rather than build
  // real reservations at this scale (config/dials.ts).
  console.error(
    "[STRIPE_WEBHOOK] OVERSOLD",
    orderId,
    "policy:",
    dials.oversellPolicy,
  );

  const stripe = getStripe();
  if (!stripe || !paymentIntentId) {
    console.error(
      "[STRIPE_WEBHOOK] oversold order needs a MANUAL refund",
      orderId,
    );
    return;
  }

  // Failures below are rethrown on purpose. This is the one path where somebody
  // has paid for a thing that does not exist, so a single swallowed attempt
  // would leave them charged with nothing retrying. Letting it escape returns a
  // 500, Stripe redelivers, and the RPC now replays the stored 'oversold'
  // outcome so we land back here. Both steps are idempotent, so retrying is
  // safe: the refund is keyed, and the status write is a plain assignment.
  const refund = await stripe.refunds.create(
    { payment_intent: paymentIntentId },
    // Same key on a redelivery returns the original refund instead of issuing
    // a second one.
    { idempotencyKey: `oversold-refund-${orderId}` },
  );

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", orderId);

  if (error) {
    console.error(
      "[STRIPE_WEBHOOK] refunded but could not mark the order",
      orderId,
      refund.id,
      error.message,
    );
    throw new Error(`could not mark order ${orderId} refunded: ${error.message}`);
  }
}
