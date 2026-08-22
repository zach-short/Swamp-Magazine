"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { denyAdminEmail } from "@/features/admin/lib/admin-allowlist";
import { adminRoutes } from "@/features/admin/lib/admin-routes";
import { createClient } from "@/lib/supabase/server";

export type AdminSignInFailure =
  | "invalid-email"
  | "no-allowlist"
  | "not-allowed"
  | "send-failed";

export type AdminSignInState =
  | { status: "idle" }
  | { status: "success"; email: string }
  | { status: "error"; reason: AdminSignInFailure };

const emailSchema = z.email().max(320);

/**
 * Sends the magic link -- but only to an allowlisted address.
 *
 * The allowlist check happens BEFORE Supabase is touched: `signInWithOtp`
 * creates an auth user for whatever address it is handed, so an unguarded form
 * here would be both a mail relay and a way to fill the auth table with
 * strangers.
 */
export async function sendAdminMagicLink(
  _previous: AdminSignInState,
  formData: FormData,
): Promise<AdminSignInState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", reason: "invalid-email" };
  }

  const email = parsed.data.trim().toLowerCase();
  const denial = denyAdminEmail(email);
  if (denial === "no-allowlist") {
    return { status: "error", reason: "no-allowlist" };
  }
  if (denial) {
    return { status: "error", reason: "not-allowed" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Safe against a spoofed Host header: Supabase only honours redirect
        // targets that match the project's configured Redirect URLs, and falls
        // back to the Site URL otherwise.
        emailRedirectTo: `${await resolveOrigin()}${adminRoutes.callback}`,
        // The two admins have no accounts until their first sign-in, and the
        // allowlist above is what keeps this from being open registration.
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("[ADMIN_SIGN_IN]", error.status, error.message);
      return { status: "error", reason: "send-failed" };
    }

    return { status: "success", email };
  } catch (error) {
    console.error("[ADMIN_SIGN_IN]", error);
    return { status: "error", reason: "send-failed" };
  }
}

async function resolveOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${protocol}://${host}`;
}
