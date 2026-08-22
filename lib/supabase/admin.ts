import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { clientEnv } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";

// Service-role client -- bypasses RLS. subscribers/orders/order_items carry no
// RLS policies at all, so this is the only way any code reaches them.
export function createAdminClient() {
  return createSupabaseClient(clientEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
