"use client";

import { useActionState } from "react";

import {
  sendAdminMagicLink,
  type AdminSignInFailure,
  type AdminSignInState,
} from "@/actions/admin-sign-in";

const initialState: AdminSignInState = { status: "idle" };

const failureMessages: Record<AdminSignInFailure, string> = {
  "invalid-email": "THAT EMAIL DOESN'T LOOK RIGHT",
  "not-allowed": "THAT ADDRESS ISN'T ON THE ADMIN LIST",
  "no-allowlist": "ADMIN ACCESS ISN'T CONFIGURED YET. TELL ZACH",
  "send-failed": "COULDN'T SEND THE LINK. TRY AGAIN",
};

export function AdminSignInForm() {
  const [state, formAction, isPending] = useActionState(
    sendAdminMagicLink,
    initialState,
  );

  if (state.status === "success") {
    return (
      <div className="flex w-full max-w-md flex-col gap-3 border-2 border-current p-8 text-center">
        <p className="font-display text-4xl">CHECK YOUR EMAIL</p>
        <p className="font-body text-xs tracking-widest break-all">
          A SIGN-IN LINK IS ON ITS WAY TO {state.email.toUpperCase()}
        </p>
        <p className="font-body text-[10px] tracking-widest opacity-70">
          OPEN IT ON THIS DEVICE
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex w-full max-w-md flex-col gap-5 border-2 border-current p-6 text-left sm:p-8"
    >
      <div className="flex flex-col gap-1">
        <p className="font-display text-2xl leading-tight sm:text-3xl">
          SIGN IN
        </p>
        <p className="font-body text-xs tracking-widest">
          WE EMAIL YOU A LINK. NO PASSWORD
        </p>
      </div>

      <label className="flex flex-col gap-1 font-body text-xs tracking-widest">
        EMAIL
        <input
          className="border-b-2 border-current bg-transparent py-2 font-body text-base tracking-wide outline-none"
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
        />
      </label>

      {state.status === "error" ? (
        <p role="alert" className="font-body text-xs font-bold tracking-widest">
          {failureMessages[state.reason]}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="border-2 border-current px-6 py-3 font-display text-xl tracking-wide transition-opacity hover:opacity-70 disabled:opacity-40"
      >
        {isPending ? "SENDING..." : "SEND LINK"}
      </button>
    </form>
  );
}
