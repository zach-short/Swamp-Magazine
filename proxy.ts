import type { NextRequest } from "next/server";

import { updateAdminSession } from "@/lib/supabase/proxy";

// Next 16 renamed the `middleware` file convention to `proxy`; `middleware.ts`
// still runs but warns on every build, so the new name is used here.
export async function proxy(request: NextRequest) {
  return updateAdminSession(request);
}

export const config = {
  // Scoped to /admin deliberately. The storefront is anonymous and cached
  // per-request already -- running the auth cookie dance in front of it would
  // buy nothing and cost every visitor a Supabase round trip.
  matcher: ["/admin", "/admin/:path*"],
};
