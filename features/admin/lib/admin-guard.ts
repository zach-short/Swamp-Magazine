import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { denyAdminEmail, type AdminDenial } from "./admin-allowlist";
import { adminRoutes } from "./admin-routes";

export type AdminIdentity = { email: string };

export type AdminAccess =
  | { status: "ok"; email: string }
  | { status: "denied"; reason: AdminDenial };

/**
 * The real guard. The proxy only refreshes the session and bounces obvious
 * anonymous traffic; every server render and every route handler that touches
 * admin data calls this, because a proxy matcher is one config typo away from
 * not running at all.
 *
 * `getClaims` verifies the JWT signature, so the email it returns is the
 * identity Supabase issued -- not a value lifted from a spoofable cookie.
 */
export async function resolveAdminAccess(): Promise<AdminAccess> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      console.error("[ADMIN_GUARD]", error.message);
      return { status: "denied", reason: "signed-out" };
    }

    const email = data?.claims.email?.trim().toLowerCase();
    if (!email) {
      // Covers both "no session" and "signature verified but no email claim":
      // an identity we cannot name is an identity we cannot authorize.
      return { status: "denied", reason: "signed-out" };
    }

    const denial = denyAdminEmail(email);
    if (denial) return { status: "denied", reason: denial };

    return { status: "ok", email };
  } catch (error) {
    // An unreadable session is a denial, never a pass.
    console.error("[ADMIN_GUARD]", error);
    return { status: "denied", reason: "signed-out" };
  }
}

/**
 * Server-render entry point: allowed callers get their identity, everyone else
 * is redirected. A signed-in address that is not on the allowlist is routed
 * through sign-out so the stale session is actually cleared -- Server
 * Components cannot write cookies, so signing out here would be a no-op.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const access = await resolveAdminAccess();
  if (access.status === "ok") return { email: access.email };

  if (access.reason === "signed-out") redirect(adminRoutes.signIn);
  redirect(`${adminRoutes.signOut}?denied=${access.reason}`);
}
