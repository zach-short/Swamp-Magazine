import type Stripe from "stripe";

// The webhook's decision logic, separated from its transport and its side
// effects. The route does signature verification and wiring; everything that
// decides whether money moves lives here, behind injected dependencies, so the
// paths that fail silently in production (a replayed event, a session that is
// not actually paid, an oversell) are provable in vitest (BD-5).

export type CompletionOutcome =
  | "applied"
  | "already-applied"
  | "oversold"
  | "order-not-found";

export type ApplyCompletionInput = {
  eventId: string;
  eventType: string;
  orderId: string;
  sessionId: string;
  paymentIntentId: string | null;
  amountTotalCents: number | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: unknown;
};

export type CheckoutCompletionDeps = {
  applyCompletion: (input: ApplyCompletionInput) => Promise<CompletionOutcome>;
  sendConfirmation: (orderId: string) => Promise<void>;
  refundOversold: (input: {
    orderId: string;
    paymentIntentId: string | null;
  }) => Promise<void>;
};

export type WebhookAction =
  | "ignored"
  | "awaiting-payment"
  | "unlinked"
  | "applied"
  | "already-applied"
  | "order-not-found"
  | "oversold-refunded";

// Card payments settle inside checkout.session.completed; a delayed method
// leaves that event unpaid and settles later in async_payment_succeeded. Both
// are handled, and payment_status is what decides -- never the event name.
const SETTLEMENT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export async function handleStripeEvent(
  event: Stripe.Event,
  deps: CheckoutCompletionDeps,
): Promise<WebhookAction> {
  if (!SETTLEMENT_EVENTS.has(event.type)) {
    return "ignored";
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    return "awaiting-payment";
  }

  // metadata.order_id is the authoritative link back to our row: it is written
  // at session creation, before the session id is stored, so it survives a
  // crash between those two writes.
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    return "unlinked";
  }

  const outcome = await deps.applyCompletion({
    eventId: event.id,
    eventType: event.type,
    orderId,
    sessionId: session.id,
    paymentIntentId: readPaymentIntentId(session),
    amountTotalCents: session.amount_total,
    customerName: session.customer_details?.name ?? null,
    customerEmail: session.customer_details?.email ?? null,
    customerPhone: session.customer_details?.phone ?? null,
    shippingAddress: readShippingAddress(session),
  });

  switch (outcome) {
    case "applied":
      // The email hangs off the once-only transition, so a redelivery cannot
      // mail the buyer twice.
      await deps.sendConfirmation(orderId);
      return "applied";
    case "oversold":
      await deps.refundOversold({
        orderId,
        paymentIntentId: readPaymentIntentId(session),
      });
      return "oversold-refunded";
    case "order-not-found":
      return "order-not-found";
    case "already-applied":
      return "already-applied";
  }
}

function readPaymentIntentId(session: Stripe.Checkout.Session): string | null {
  const intent = session.payment_intent;
  if (!intent) return null;
  return typeof intent === "string" ? intent : intent.id;
}

// As of API version 2026-07-29.dahlia the shipping address lives under
// collected_information; the top-level shipping_details of older versions is
// gone, so reading the wrong one would store null for every shipped order.
function readShippingAddress(session: Stripe.Checkout.Session): unknown {
  return session.collected_information?.shipping_details ?? null;
}
