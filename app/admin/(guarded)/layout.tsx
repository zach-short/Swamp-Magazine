import type { ReactNode } from "react";

import { AdminShell, requireAdmin } from "@/features/admin";

// The real authorization boundary. Everything inside this route group renders
// only after requireAdmin() has verified a signed JWT and matched its email
// against the allowlist; the proxy in front is a convenience, not the lock.
//
// Lanes H and I mount /admin/products, /admin/slots and /admin/orders as
// segments INSIDE this group -- put them in app/admin/(guarded)/ and they
// inherit the guard for free. A route handler, though, is not covered by a
// layout: any route.ts under here must call requireAdmin() (or
// resolveAdminAccess) itself, the way the CSV export does.
export const dynamic = "force-dynamic";

// Typed inline rather than through LayoutProps<...>: Next only regenerates
// .next/types on a build, so the generated route union does not know about a
// route added since the last one and tsc fails on correct code.
type GuardedAdminLayoutProps = { children: ReactNode };

export default async function GuardedAdminLayout({
  children,
}: GuardedAdminLayoutProps) {
  const admin = await requireAdmin();

  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
