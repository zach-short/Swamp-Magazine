import { loadStripe } from "@stripe/stripe-js";

import { clientEnv } from "@/lib/env/client";

// Stripe.js gets injected once per page load. Calling loadStripe inside a
// component would re-inject the script on every render and take the mounted
// card fields down with it, so it is resolved here at module scope and shared
// by both steps of the order form. A missing publishable key is a deploy state,
// not a crash -- null is what the form's quiet closed notice reads off.
export const stripePromise = clientEnv.stripePublishableKey
  ? loadStripe(clientEnv.stripePublishableKey)
  : null;
