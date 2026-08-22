import "server-only";

import { z } from "zod";

// Server-only secrets. The secret key bypasses RLS -- it must never appear in a
// client bundle, which the "server-only" import guarantees at build time.
const serverEnvSchema = z
  .object({
    SUPABASE_SECRET_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    // onboarding@resend.dev works unverified for testing; swaps to the real
    // domain after DNS verification in P5.
    RESEND_FROM: z
      .string()
      .min(1)
      .default("SWAMP MAGAZINE <onboarding@resend.dev>"),
    // Optional until their phases arm them: the app must boot (and gates must
    // pass) without Stripe or an admin allowlist, but the money path (P3) and
    // /admin guard (P4) fail loudly at runtime if used while unset.
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    ADMIN_EMAILS: z.string().optional(),
  })
  .transform((raw) => ({
    supabaseSecretKey: raw.SUPABASE_SECRET_KEY,
    resendApiKey: raw.RESEND_API_KEY,
    resendFrom: raw.RESEND_FROM,
    stripeSecretKey: raw.STRIPE_SECRET_KEY,
    stripeWebhookSecret: raw.STRIPE_WEBHOOK_SECRET,
    adminEmails: (raw.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  }));

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM: process.env.RESEND_FROM,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
});
