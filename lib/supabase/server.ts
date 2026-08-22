import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { clientEnv } from "@/lib/env/client";

// Anon-key server client for public storefront reads. Sees only what RLS
// exposes (products, variants, site_settings, image_slots). Auth sessions
// arrive with the admin in P4; the cookie wiring is already in place for that.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.supabaseUrl,
    clientEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies; session refresh will be
            // middleware's job once auth exists (P4).
          }
        },
      },
    },
  );
}
