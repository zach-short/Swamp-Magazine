"use client";

import { useActionState } from "react";

import {
  startAdminGoogleSignIn,
  type AdminSignInFailure,
  type AdminSignInState,
} from "@/actions/admin-sign-in";

const initialState: AdminSignInState = { status: "idle" };

const failureMessages: Record<AdminSignInFailure, string> = {
  "no-allowlist": "ADMIN ACCESS ISN'T CONFIGURED YET. TELL ZACH",
  "google-unreachable": "COULDN'T REACH GOOGLE. TRY AGAIN",
};

// No success state: the action either reports why it could not start or
// throws the browser at Google, so there is nothing left to render.
export function AdminSignInForm() {
  const [state, formAction, isPending] = useActionState<
    AdminSignInState,
    FormData
  >(startAdminGoogleSignIn, initialState);

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
          GOOGLE ONLY. NO PASSWORD
        </p>
      </div>

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
        {isPending ? "OPENING GOOGLE..." : "CONTINUE WITH GOOGLE"}
      </button>
    </form>
  );
}
