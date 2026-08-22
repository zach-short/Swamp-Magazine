// Dev utility: flip site_settings.mode without opening Studio. The storefront
// is only reachable in live mode, so build/verify sessions need this switch;
// the founder-facing toggle ships with the admin in P4.
//
// Run: bun run scripts/flip-mode.ts live|coming_soon
//      (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY in .env.local)

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const mode = z.enum(["coming_soon", "live"]).parse(process.argv[2]);

const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
  })
  .parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data, error } = await supabase
  .from("site_settings")
  .update({ mode })
  .eq("id", 1)
  .select("mode")
  .single();

if (error) throw new Error(error.message);
console.log(`site mode -> ${data.mode}`);
