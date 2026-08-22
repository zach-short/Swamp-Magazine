"use server";

import { redirect } from "next/navigation";

import { adminRoutes } from "@/features/admin/lib/admin-routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign-out from the admin shell. A Server Action can write cookies, which is
 * why this lives here and not in the layout -- `signOut()` from a Server
 * Component clears nothing.
 */
export async function signOutAdmin(): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) console.error("[ADMIN_SIGN_OUT]", error.message);
  } catch (error) {
    // Even a failed revocation should land the founder on the sign-in screen
    // rather than a broken admin page.
    console.error("[ADMIN_SIGN_OUT]", error);
  }

  redirect(adminRoutes.signIn);
}
