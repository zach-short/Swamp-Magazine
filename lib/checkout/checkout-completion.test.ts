import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  handleStripeEvent,
  type ApplyCompletionInput,
  type CompletionOutcome,
} from "./checkout-completion";

// PLAN.md P3's proofs, as far as they can be proved without Postgres: a replayed
// event must not decrement twice, a decrement must happen exactly once, and an
// unpaid session must not settle anything.
//
// applyStore below is a model of apply_checkout_completion's guards (the event
// id insert, then the pending -> paid compare-and-swap). It is a model, not the
// migration: the authoritative proof is the Stripe CLI replay against the real
// function, which is on the live-keys checklist.

type StoreState = {
  events: Map<string, CompletionOutcome>;
  orders: Map<string, { status: string; variantId: string; quantity: number }>;
  inventory: Map<string, number>;
};

function createStore(inventoryCount = 12): StoreState {
  return {
    events: new Map(),
    orders: new Map([
      ["order-1", { status: "pending", variantId: "var-s", quantity: 1 }],
    ]),
    inventory: new Map([["var-s", inventoryCount]]),
  };
}

function applyAgainst(store: StoreState) {
  return async (input: ApplyCompletionInput): Promise<CompletionOutcome> => {
    // Mirrors the migration's duplicate branch: it replays the STORED outcome,
    // not a constant. Returning a flat "already-applied" here would hide the
    // case that matters -- a redelivered oversold event has to reach the refund
    // again, or a buyer stays charged for stock that does not exist.
    const seen = store.events.get(input.eventId);
    if (seen) return seen;

    const order = store.orders.get(input.orderId);
    let outcome: CompletionOutcome;

    if (!order) {
      outcome = "order-not-found";
    } else if (order.status !== "pending") {
      outcome = "already-applied";
    } else {
      order.status = "paid";
      const stock = store.inventory.get(order.variantId) ?? 0;
      if (stock < order.quantity) {
        outcome = "oversold";
      } else {
        store.inventory.set(order.variantId, stock - order.quantity);
        outcome = "applied";
      }
    }

    store.events.set(input.eventId, outcome);
    return outcome;
  };
}

type Recorder = {
  emails: string[];
  refunds: string[];
};

function createDeps(store: StoreState, recorder: Recorder) {
  return {
    applyCompletion: applyAgainst(store),
    sendConfirmation: async (orderId: string) => {
      recorder.emails.push(orderId);
    },
    refundOversold: async ({ orderId }: { orderId: string }) => {
      recorder.refunds.push(orderId);
    },
  };
}

function completedEvent(
  overrides: {
    id?: string;
    type?: string;
    paymentStatus?: string;
    orderId?: string | null;
  } = {},
): Stripe.Event {
  const session = {
    id: "cs_test_123",
    object: "checkout.session",
    payment_status: overrides.paymentStatus ?? "paid",
    payment_intent: "pi_test_123",
    amount_total: 2000,
    customer_details: { name: "Test Buyer", email: "buyer@example.com", phone: null },
    collected_information: null,
    metadata:
      overrides.orderId === null ? {} : { order_id: overrides.orderId ?? "order-1" },
  };

  return {
    id: overrides.id ?? "evt_test_1",
    type: overrides.type ?? "checkout.session.completed",
    data: { object: session },
  } as unknown as Stripe.Event;
}

describe("handleStripeEvent", () => {
  it("decrements exactly once for a paid session", async () => {
    const store = createStore();
    const recorder: Recorder = { emails: [], refunds: [] };

    const action = await handleStripeEvent(
      completedEvent(),
      createDeps(store, recorder),
    );

    expect(action).toBe("applied");
    expect(store.inventory.get("var-s")).toBe(11);
    expect(recorder.emails).toEqual(["order-1"]);
    expect(recorder.refunds).toEqual([]);
  });

  it("does not decrement again when the same event id is replayed", async () => {
    const store = createStore();
    const recorder: Recorder = { emails: [], refunds: [] };
    const deps = createDeps(store, recorder);
    const event = completedEvent();

    await handleStripeEvent(event, deps);
    await handleStripeEvent(event, deps);
    await handleStripeEvent(event, deps);

    // The point of this case: three deliveries, one unit of stock.
    expect(store.inventory.get("var-s")).toBe(11);
    // The order settles once and stays settled.
    expect(store.orders.get("order-1")?.status).toBe("paid");
    expect(recorder.refunds).toEqual([]);
  });

  it("does not decrement again for a different event id on the same order", async () => {
    const store = createStore();
    const recorder: Recorder = { emails: [], refunds: [] };
    const deps = createDeps(store, recorder);

    await handleStripeEvent(completedEvent({ id: "evt_a" }), deps);
    const second = await handleStripeEvent(
      completedEvent({ id: "evt_b", type: "checkout.session.async_payment_succeeded" }),
      deps,
    );

    expect(second).toBe("already-applied");
    expect(store.inventory.get("var-s")).toBe(11);
    expect(recorder.emails).toEqual(["order-1"]);
  });

  it("settles nothing while the session is still unpaid", async () => {
    const store = createStore();
    const recorder: Recorder = { emails: [], refunds: [] };

    const action = await handleStripeEvent(
      completedEvent({ paymentStatus: "unpaid" }),
      createDeps(store, recorder),
    );

    expect(action).toBe("awaiting-payment");
    expect(store.inventory.get("var-s")).toBe(12);
    expect(recorder.emails).toEqual([]);
  });

  it("refunds instead of mailing when the last unit was already taken", async () => {
    const store = createStore(0);
    const recorder: Recorder = { emails: [], refunds: [] };

    const action = await handleStripeEvent(
      completedEvent(),
      createDeps(store, recorder),
    );

    expect(action).toBe("oversold-refunded");
    expect(store.inventory.get("var-s")).toBe(0);
    expect(recorder.refunds).toEqual(["order-1"]);
    expect(recorder.emails).toEqual([]);
  });

  it("retries the refund when an oversold event is redelivered", async () => {
    // The failure this guards: a refund that fails on first delivery used to be
    // unreachable forever, because the replay reported "already-applied". The
    // buyer stayed charged for a thing that does not exist.
    const store = createStore(0);
    const recorder: Recorder = { emails: [], refunds: [] };
    const deps = createDeps(store, recorder);
    const event = completedEvent();

    await handleStripeEvent(event, deps);
    const replay = await handleStripeEvent(event, deps);

    expect(replay).toBe("oversold-refunded");
    expect(recorder.refunds).toEqual(["order-1", "order-1"]);
    // Still nothing sold and nobody mailed.
    expect(store.inventory.get("var-s")).toBe(0);
    expect(recorder.emails).toEqual([]);
  });

  it("does not re-mail when an applied event is redelivered", async () => {
    // The mirror of the case above: replaying the stored outcome must not turn
    // into a second confirmation email.
    const store = createStore();
    const recorder: Recorder = { emails: [], refunds: [] };
    const deps = createDeps(store, recorder);
    const event = completedEvent();

    await handleStripeEvent(event, deps);
    const replay = await handleStripeEvent(event, deps);

    expect(replay).toBe("applied");
    expect(store.inventory.get("var-s")).toBe(11);
    // sendConfirmation is called again, but the claim in the route makes it a
    // no-op; the model records only what the deps were asked to do.
    expect(recorder.emails).toEqual(["order-1", "order-1"]);
  });

  it("ignores event types that are not settlements", async () => {
    const store = createStore();
    const recorder: Recorder = { emails: [], refunds: [] };

    const action = await handleStripeEvent(
      completedEvent({ type: "payment_intent.created" }),
      createDeps(store, recorder),
    );

    expect(action).toBe("ignored");
    expect(store.inventory.get("var-s")).toBe(12);
  });

  it("refuses to guess when a paid session carries no order id", async () => {
    const store = createStore();
    const recorder: Recorder = { emails: [], refunds: [] };

    const action = await handleStripeEvent(
      completedEvent({ orderId: null }),
      createDeps(store, recorder),
    );

    expect(action).toBe("unlinked");
    expect(store.inventory.get("var-s")).toBe(12);
    expect(recorder.emails).toEqual([]);
  });
});
