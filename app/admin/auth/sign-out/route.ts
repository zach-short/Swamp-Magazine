import { NextResponse, type NextRequest } from "next/server";

import { adminRoutes } from "@/features/admin";
import { createClient } from "@/lib/supabase/server";

// The exit for a denied session. The guard runs in a Server Component, which
// cannot write cookies, so it redirects here: a route handler can, and the
// stale session actually gets cleared before the denial is shown.
export async function GET(request: NextRequest) {
  const denied = request.nextUrl.searchParams.get("denied");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) console.error("[ADMIN_SIGN_OUT]", error.message);
  } catch (error) {
    // Land on sign-in either way; a failed revocation must not strand anyone
    // on a half-broken admin page.
    console.error("[ADMIN_SIGN_OUT]", error);
  }

  const target = new URL(adminRoutes.signIn, request.nextUrl.origin);
  if (denied) target.searchParams.set("denied", denied);
  return NextResponse.redirect(target);
}
