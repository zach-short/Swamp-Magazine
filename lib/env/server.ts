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
  })
  .transform((raw) => ({
    supabaseSecretKey: raw.SUPABASE_SECRET_KEY,
    resendApiKey: raw.RESEND_API_KEY,
    resendFrom: raw.RESEND_FROM,
  }));

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM: process.env.RESEND_FROM,
});
