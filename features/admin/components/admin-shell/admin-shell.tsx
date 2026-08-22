import type { ReactNode } from "react";

import { signOutAdmin } from "@/actions/admin-sign-out";

import { AdminNav } from "../admin-nav/admin-nav";

type AdminShellProps = { email: string; children: ReactNode };

// Phone-first chrome: one column, big tap targets, no sidebar to collapse.
// The founder runs this standing in a hallway, not at a desk.
export function AdminShell({ email, children }: AdminShellProps) {
  return (
    <div className="min-h-dvh bg-cream text-brand-red">
      <header className="border-b-2 border-current px-4 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <p className="font-display text-2xl leading-none sm:text-3xl">
              SWAMP ADMIN
            </p>
            <p className="mt-1 font-body text-[10px] tracking-widest break-all opacity-70">
              {email.toUpperCase()}
            </p>
          </div>

          <form action={signOutAdmin}>
            <button
              type="submit"
              className="border-2 border-current px-3 py-2 font-display text-sm tracking-wide transition-opacity hover:opacity-70"
            >
              SIGN OUT
            </button>
          </form>
        </div>

        <div className="mt-3">
          <AdminNav />
        </div>
      </header>

      <main className="px-4 py-6 pb-16">{children}</main>
    </div>
  );
}
