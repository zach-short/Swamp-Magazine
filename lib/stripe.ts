import "server-only";

import Stripe from "stripe";

import { serverEnv } from "@/lib/env/server";

// Stripe keys are optional at boot so the gates stay green before the founder's
// account exists (lib/env/server.ts). That makes "configured?" a runtime
// question, so callers get null rather than a client that throws on first use --
// the order form renders its quiet unavailable state off exactly this.
//
// The API version is deliberately not pinned here: stripe@22 already pins
// 2026-07-29.dahlia, and that is the version the installed types describe.
// Overriding it would let the request and the types disagree.

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = serverEnv.stripeSecretKey;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}
