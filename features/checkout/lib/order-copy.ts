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
  /** LIFTED -- the mockups' last line, verbatim. It sits on the card step now
   * rather than on the size step: with the fields on our own page, SUBMIT is
   * finally the act that actually sends the order, which is what the mockup
   * means by it. Founder's to confirm. */
  submit: "SUBMIT",
  /** INVENTED -- the mockups have no two-step order, so nothing was lifted for
   * the word that carries a buyer from the size row to the card fields. Kept
   * deliberately non-terminal so it cannot be misread as SUBMIT. */
  next: "NEXT",
  /** LIFTED from the P1 subscribe form's pending state, for one pending voice. */
  submitPending: "SENDING...",
  /** INVENTED -- the way back to the size row from the card step. */
  changeSize: "CHANGE SIZE",
  /** INVENTED -- heads the payment chooser. The mockups pay by Venmo and so
   * never needed to name the act. */
  payWith: "PAY WITH",
  /** INVENTED -- the chooser's third option. Apple Pay and Google Pay draw
   * their own marks and cannot be relabelled; this is the only one we name. */
  payWithCard: "CARD",
  /** INVENTED -- reopens the chooser after a method has been picked. */
  changePayment: "CHANGE PAYMENT METHOD",
  /** LIFTED -- the mockups' first field, verbatim. */
  name: "NAME",
  /** INVENTED -- shown when SUBMIT is pressed with the name still blank. */
  nameMissing: "WE NEED A NAME FOR THE ORDER",
  /** INVENTED -- the mockups collect NAME/PHONE/ADDRESS but never an email;
   * Stripe needs one to send the receipt. */
  email: "EMAIL",
  /** INVENTED -- shown while Stripe.js is still building the card fields. */
  paymentLoading: "ONE SECOND...",
  /** INVENTED -- last resort when a confirm fails with nothing quotable. Stripe's
   * own message is preferred whenever there is one; see `paymentErrorLine`. */
  paymentFailed: "THAT PAYMENT DIDN'T GO THROUGH. TRY AGAIN",
  /** INVENTED -- the card step could not be built at all. */
  paymentUnavailable: "CHECKOUT ISN'T ANSWERING. TRY AGAIN",
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

/**
 * Stripe writes genuinely useful failures ("Your card number is incomplete"),
 * and throwing them away for one house-voice line would leave a buyer guessing
 * which field is wrong. Uppercasing keeps the register without losing the
 * diagnosis; only a blank message falls back to our own words.
 */
export function paymentErrorLine(message: string | undefined | null): string {
  const trimmed = message?.trim();
  return trimmed ? trimmed.toUpperCase() : orderCopy.paymentFailed;
}
