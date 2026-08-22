import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { adminRoutes, isPublicAdminPath } from "@/features/admin/lib/admin-routes";
import { clientEnv } from "@/lib/env/client";

// Session refresh for the /admin tree. Supabase access tokens expire in an
// hour; without this the founder gets silently logged out mid-task because a
// Server Component cannot write the refreshed cookie back.
//
// This is refresh plus a cheap redirect ONLY. Authorization (the allowlist)
// lives server-side in the guarded layout -- a proxy that also authorized
// would be the single point of failure the PLAN warns about.
export async function updateAdminSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.supabaseUrl,
    clientEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Nothing may run between createServerClient and getClaims: an early return
  // here skips the refresh write and logs people out at random. getClaims
  // verifies the JWT signature, so unlike getSession its answer is trustworthy
  // even though the cookie itself is spoofable.
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    console.error("[ADMIN_PROXY]", error.message);
  }

  const signedIn = Boolean(data?.claims);
  if (!signedIn && !isPublicAdminPath(request.nextUrl.pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = adminRoutes.signIn;
    target.search = "";

    // Carry the refreshed cookies onto the redirect, or the browser and the
    // server go out of sync and the next request looks signed out too.
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
