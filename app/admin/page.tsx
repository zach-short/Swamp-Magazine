import type { Metadata } from "next";

// Stub so /admin exists outside the site-mode gate from day one (PLAN P1).
// The real admin -- auth allowlist, mode toggle, CRUD -- lands in P4.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink text-brand-red">
      <p className="font-display text-3xl">ADMIN LANDS IN P4</p>
    </main>
  );
}
