import { z } from "zod";

// Env is validated once here and exported camelCase; app code never reads
// process.env directly. NEXT_PUBLIC_ values are inlined at build time, so each
// key must be referenced literally below. Documented in .env.example.
const clientEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    // Optional until P3 arms checkout; the embedded checkout mount fails
    // loudly at runtime if used while unset.
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  })
  .transform((raw) => ({
    supabaseUrl: raw.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    stripePublishableKey: raw.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  }));

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});
