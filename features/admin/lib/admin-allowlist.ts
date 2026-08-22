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

  if (allowlist.length === 0) {
    console.error(
      "[ADMIN_ALLOWLIST] ADMIN_EMAILS is empty -- every /admin request is denied. Set ADMIN_EMAILS (comma-separated) in the environment.",
    );
    return "no-allowlist";
  }

  const normalized = email?.trim().toLowerCase();
  if (!normalized) return "signed-out";
  if (!allowlist.includes(normalized)) {
    console.error("[ADMIN_ALLOWLIST] not on the allowlist:", normalized);
    return "not-allowed";
  }

  return null;
}
