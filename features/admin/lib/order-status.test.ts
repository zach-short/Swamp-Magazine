import { describe, expect, it } from "vitest";

import {
  allowedTransitions,
  canTransition,
  handoverStatusFor,
  isAwaitingHandover,
  isDeliveryMethod,
  isOrderStatus,
} from "./order-status";

// These rules are the only thing standing between a phone tap and the orders
// table, which is the one table nobody can reconstruct from Stripe alone.
describe("allowedTransitions", () => {
  it("offers pickup orders the pickup word and shipped orders the shipped one", () => {
    expect(allowedTransitions("paid", "pickup")).toEqual(["picked_up"]);
    expect(allowedTransitions("paid", "shipping")).toEqual(["fulfilled"]);
  });

  it("lets a mis-tapped handover be undone", () => {
    // The founder taps this while handing someone a shirt. One-way would be
    // worse than reversible.
    expect(allowedTransitions("picked_up", "pickup")).toEqual(["paid"]);
    expect(allowedTransitions("fulfilled", "shipping")).toEqual(["paid"]);
  });

  it("offers nothing on an unpaid order", () => {
    // Only the Stripe webhook may mark an order paid; a button here would
    // decouple the table from the money.
    expect(allowedTransitions("pending", "pickup")).toEqual([]);
    expect(allowedTransitions("pending", "shipping")).toEqual([]);
  });

  it("offers nothing on a terminal money state", () => {
    // Refunds happen in Stripe. A status set here would claim one that never
    // left the account.
    expect(allowedTransitions("refunded", "pickup")).toEqual([]);
    expect(allowedTransitions("canceled", "shipping")).toEqual([]);
  });

  it("does not offer the other method's word", () => {
    // A pickup order marked "shipped" is a lie the founder cannot later read
    // his way out of.
    expect(allowedTransitions("paid", "pickup")).not.toContain("fulfilled");
    expect(allowedTransitions("paid", "shipping")).not.toContain("picked_up");
  });
});

describe("canTransition", () => {
  it("agrees with allowedTransitions", () => {
    expect(canTransition("paid", "picked_up", "pickup")).toBe(true);
    expect(canTransition("paid", "fulfilled", "shipping")).toBe(true);
  });

  it("rejects the cross-method handover", () => {
    expect(canTransition("paid", "fulfilled", "pickup")).toBe(false);
    expect(canTransition("paid", "picked_up", "shipping")).toBe(false);
  });

  it("rejects inventing a payment", () => {
    expect(canTransition("pending", "paid", "pickup")).toBe(false);
    expect(canTransition("pending", "picked_up", "pickup")).toBe(false);
  });

  it("rejects a refund by hand", () => {
    expect(canTransition("paid", "refunded", "pickup")).toBe(false);
    expect(canTransition("paid", "canceled", "shipping")).toBe(false);
  });
});

describe("handoverStatusFor", () => {
  it("names the physical event, not a generic one", () => {
    expect(handoverStatusFor("pickup")).toBe("picked_up");
    expect(handoverStatusFor("shipping")).toBe("fulfilled");
  });
});

describe("isAwaitingHandover", () => {
  it("counts only orders where the money landed and the thing has not moved", () => {
    expect(isAwaitingHandover("paid")).toBe(true);
    expect(isAwaitingHandover("pending")).toBe(false);
    expect(isAwaitingHandover("picked_up")).toBe(false);
    expect(isAwaitingHandover("fulfilled")).toBe(false);
    expect(isAwaitingHandover("refunded")).toBe(false);
  });
});

describe("guards", () => {
  it("only admits values the check constraint allows", () => {
    // These gate what reaches the DB; a stray string here becomes a 400 from
    // Postgres at best and a wrong status at worst.
    expect(isOrderStatus("paid")).toBe(true);
    expect(isOrderStatus("picked_up")).toBe(true);
    expect(isOrderStatus("shipped")).toBe(false);
    expect(isOrderStatus("")).toBe(false);
    expect(isOrderStatus(null)).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
    expect(isOrderStatus(7)).toBe(false);

    expect(isDeliveryMethod("pickup")).toBe(true);
    expect(isDeliveryMethod("shipping")).toBe(true);
    expect(isDeliveryMethod("ship")).toBe(false);
    expect(isDeliveryMethod(null)).toBe(false);
  });
});
