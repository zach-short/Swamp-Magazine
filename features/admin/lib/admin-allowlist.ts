import "server-only";

import { serverEnv } from "@/lib/env/server";

export type AdminDenial = "signed-out" | "no-allowlist" | "not-allowed";

/**
 * The whole authorization decision, in one place.
 *
 * Fails closed twice over: an unset ADMIN_EMAILS denies everyone rather than
 * admitting everyone, and an address that is merely authenticated is still
 * nobody. Returns `null` when the caller is allowed.
 */
export function denyAdminEmail(email: string | null | undefined): AdminDenial | null {
  const allowlist = serverEnv.adminEmails;

  if (!hasAdminAllowlist()) return "no-allowlist";

  const normalized = email?.trim().toLowerCase();
  if (!normalized) return "signed-out";
  if (!allowlist.includes(normalized)) {
    console.error("[ADMIN_ALLOWLIST] not on the allowlist:", normalized);
    return "not-allowed";
  }

  return null;
}

/**
 * Whether anyone can get in at all.
 *
 * Split out for the sign-in entry point: Google decides identity, so the
 * address cannot be checked before the round trip -- but an empty allowlist is
 * knowable up front, and bouncing someone through Google only to deny them at
 * the callback is a worse error message than saying so on the page.
 */
export function hasAdminAllowlist(): boolean {
  if (serverEnv.adminEmails.length > 0) return true;

  console.error(
    "[ADMIN_ALLOWLIST] ADMIN_EMAILS is empty -- every /admin request is denied. Set ADMIN_EMAILS (comma-separated) in the environment.",
  );
  return false;
}
