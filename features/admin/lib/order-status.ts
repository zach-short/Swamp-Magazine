// Which status changes the founder is allowed to make by hand, and what to
// call them. Kept pure and apart from the data layer so the rules are testable
// without a database -- an admin that lets the wrong transition through
// corrupts the one table nobody can reconstruct.

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "fulfilled",
  "picked_up",
  "refunded",
  "canceled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DELIVERY_METHODS = ["pickup", "shipping"] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

export function isDeliveryMethod(value: unknown): value is DeliveryMethod {
  return DELIVERY_METHODS.includes(value as DeliveryMethod);
}

/**
 * The handover status for a delivery method. A pickup order is never
 * "fulfilled" and a shipped one is never "picked_up" -- one word each, so the
 * founder reading a list six months from now can tell what physically
 * happened without opening the order.
 */
export function handoverStatusFor(method: DeliveryMethod): OrderStatus {
  return method === "pickup" ? "picked_up" : "fulfilled";
}

/**
 * The manual moves offered for an order, in button order.
 *
 * `pending` offers nothing: only the Stripe webhook may mark an order paid,
 * and a button that fakes it would decouple the orders table from the money.
 * Refunds are absent for the same reason -- they happen in Stripe, and a
 * status set here would claim a refund that never left the account.
 *
 * The handover is reversible because the founder taps this on a phone while
 * handing someone a shirt, and a mis-tap that cannot be undone is worse than
 * one that can.
 */
export function allowedTransitions(
  status: OrderStatus,
  method: DeliveryMethod,
): OrderStatus[] {
  const handover = handoverStatusFor(method);

  if (status === "paid") return [handover];
  if (status === handover) return ["paid"];
  return [];
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  method: DeliveryMethod,
): boolean {
  return allowedTransitions(from, method).includes(to);
}

/** Button copy, uppercase to match the rest of the admin. */
export const statusActionLabel: Record<OrderStatus, string> = {
  pending: "MARK PENDING",
  paid: "UNDO -- BACK TO PAID",
  fulfilled: "MARK SHIPPED",
  picked_up: "MARK PICKED UP",
  refunded: "MARK REFUNDED",
  canceled: "MARK CANCELED",
};

/** How a status reads in the list. */
export const statusLabel: Record<OrderStatus, string> = {
  pending: "UNPAID",
  paid: "PAID",
  fulfilled: "SHIPPED",
  picked_up: "PICKED UP",
  refunded: "REFUNDED",
  canceled: "CANCELED",
};

export const deliveryLabel: Record<DeliveryMethod, string> = {
  pickup: "PICKUP",
  shipping: "SHIP",
};

/**
 * Orders still owing the founder an action. Drives the count on the dashboard
 * and the default filter -- `paid` means the money landed and the thing has
 * not left his hands yet.
 */
export function isAwaitingHandover(status: OrderStatus): boolean {
  return status === "paid";
}
