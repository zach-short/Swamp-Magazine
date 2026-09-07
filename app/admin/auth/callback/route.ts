import { NextResponse, type NextRequest } from "next/server";

import { adminRoutes, resolveAdminAccess } from "@/features/admin";
import { createClient } from "@/lib/supabase/server";

// Where Google lands after Supabase has traded the provider's response for our
// own `?code=`. PKCE, so the verifier cookie written by the sign-in action has
// to be present -- the round trip must finish in the browser that started it.
// Cookies are writable in a route handler, which is why the session is
// established here rather than in a Server Component.
//
// A cancelled consent screen comes back as `?error=access_denied` with no
// code; so does an expired one. Neither is worth distinguishing to the person
// looking at the page, so both land on the same "try again".

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  if (!code) {
    console.error(
      "[ADMIN_CALLBACK] no code:",
      searchParams.get("error_description") ?? searchParams.get("error") ?? "",
    );
    return toSignIn(origin, "sign-in-failed");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[ADMIN_CALLBACK] code exchange:", error.message);
    return toSignIn(origin, "sign-in-failed");
  }

  // Google will hand a session to anyone with a Google account -- the
  // allowlist is the only thing that makes this an admin. A denied identity
  // does not get to keep the session it just minted.
  const access = await resolveAdminAccess();
  if (access.status !== "ok") {
    console.error("[ADMIN_CALLBACK] session denied:", access.reason);
    return NextResponse.redirect(
      new URL(`${adminRoutes.signOut}?denied=${access.reason}`, origin),
    );
  }

  return NextResponse.redirect(new URL(adminRoutes.dashboard, origin));
}

function toSignIn(origin: string, reason: string) {
  const url = new URL(adminRoutes.signIn, origin);
  url.searchParams.set("denied", reason);
  return NextResponse.redirect(url);
}
