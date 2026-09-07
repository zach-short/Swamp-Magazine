import type { Metadata } from "next";
import type { ReactNode } from "react";

// Covers the whole /admin tree, sign-in included -- the admin should never
// show up in a search result. No guard here on purpose: sign-in and the
// Google callback live under /admin too, and they have to stay reachable
// while signed out. The guard is one level down, in (guarded)/layout.tsx.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Typed inline rather than through LayoutProps<...>: Next only regenerates
// .next/types on a build, so the generated route union does not know about a
// route added since the last one and tsc fails on correct code.
type AdminLayoutProps = { children: ReactNode };

export default function AdminLayout({ children }: AdminLayoutProps) {
  return children;
}
