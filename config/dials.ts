// The dial registry (PLAN.md par.3 / DESIGN.md par.5), defined once. Every tunable
// product number lives here with its provisional default -- changing one is
// config, not surgery, and copy interpolates from these values rather than
// hardcoding them. None of these defaults is a ratified product decision.

export const dials = {
  /**
   * Flat shipping rate in cents, charged when delivery_method is "shipping".
   * Founder's call; wired into Stripe shipping_options in P3.
   */
  shippingFlatRateCents: 500,

  /**
   * Oversell policy: stock is checked at checkout-session creation; if a
   * webhook race oversells anyway, the remedy is refund + apologize (real
   * reservation is overkill at this scale). Implemented in P3.
   */
  oversellPolicy: "refund_and_apologize" as const,

  /**
   * SMS sends stay off until A2P 10DLC registration clears (D4). The subscribe
   * form collects phone + consent from day one either way.
   */
  smsEnabled: false,

  /**
   * Manual Venmo path (O2-C) was offered and not selected -- launch is
   * Stripe-only (D2). Kept as a dial in case the founder asks later.
   */
  venmoEnabled: false,

  /**
   * VA sales tax is a business question for the founder, outside the codebase;
   * ships off (DESIGN.md par.5).
   */
  stripeTaxEnabled: false,
} as const;
