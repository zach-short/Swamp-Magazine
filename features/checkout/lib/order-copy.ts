import type { CreateCheckoutSessionResult } from "@/actions/create-checkout-session";

// The order block's words live here, apart from the markup, so the founder can
// review the voice without reading a component. What this replaces is the
// right-hand column of his order mockups -- PLEASE VENMO $20 / @lalo-farro /
// SUBMIT -- same terse uppercase register, Stripe instead of Venmo (D2).
// LIFTED lines came off the mockups; INVENTED lines did not exist anywhere and
// need his sign-off before P3 closes.

export type OrderErrorReason = Extract<
  CreateCheckoutSessionResult,
  { status: "error" }
>["reason"];

// Derived from the frozen E<->F contract on purpose: if Lane E ever adds a
// reason, this record stops compiling instead of the form silently swallowing
// a failure the buyer never sees.
export const orderErrorLines: Record<OrderErrorReason, string> = {
  // INVENTED -- shaped after the subscribe form's "THAT EMAIL DOESN'T LOOK RIGHT".
  "invalid-input": "THAT ORDER DIDN'T LOOK RIGHT. PICK A SIZE AND TRY AGAIN",
  // INVENTED.
  "not-found": "CAN'T FIND THAT ONE ANYMORE",
  // INVENTED.
  "sold-out": "THAT SIZE IS GONE. PICK ANOTHER",
  // INVENTED -- named in the P3 brief; the quiet state when keys aren't live yet.
  "stripe-unconfigured": "ORDERS OPEN SOON",
  // LIFTED from actions/subscribe's failure map, already shipped in P1.
  "server-error": "SOMETHING BROKE. TRY AGAIN",
};

export const orderCopy = {
  /** LIFTED -- the mockups' last line, verbatim. */
  submit: "SUBMIT",
  /** LIFTED from the P1 subscribe form's pending state, for one pending voice. */
  submitPending: "SENDING...",
  /** INVENTED -- the nudge the static mockups had no need for. */
  pickSize: "PICK A SIZE",
  /** INVENTED -- when every size is gone. */
  soldOut: "SOLD OUT",
  /** INVENTED -- delivery choice (D2 pickup/ship) is absent from the mockups. */
  pickup: "PICKUP",
  /** INVENTED. */
  shipping: "SHIP",
  /** INVENTED -- pickup's price, spelled rather than "$0". */
  free: "FREE",
  /** INVENTED -- the mockups state one number ("PLEASE VENMO $20"), not a total. */
  total: "TOTAL",
} as const;

/**
 * The mockups price in whole dollars ("PLEASE VENMO $20"), so cents only show
 * up when a price actually carries them -- a $22.50 SKU must not read "$22".
 */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
