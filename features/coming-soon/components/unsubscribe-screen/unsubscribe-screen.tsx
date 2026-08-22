"use client";

import { useActionState } from "react";

import {
  unsubscribeFromEmails,
  type UnsubscribeFailure,
  type UnsubscribeState,
} from "@/actions/unsubscribe";

type UnsubscribeScreenProps = {
  /** Subscriber id lifted from the mail link's ?id=. */
  token: string;
};

const initialState: UnsubscribeState = { status: "idle" };

const failureMessages: Record<UnsubscribeFailure, string> = {
  "invalid-token": "THAT LINK IS BROKEN. REPLY TO ANY EMAIL AND SAY STOP",
  "server-error": "SOMETHING BROKE. TRY AGAIN",
};

export function UnsubscribeScreen({ token }: UnsubscribeScreenProps) {
  const [state, formAction, isPending] = useActionState(
    unsubscribeFromEmails,
    initialState,
  );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-16 text-center text-brand-red">
      <div className="flex w-full max-w-md flex-col gap-5 border-2 border-current p-6 sm:p-8">
        <p className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-[0.95]">
          SWAMP MAGAZINE
        </p>

        {state.status === "success" ? (
          <div className="flex flex-col gap-2">
            <p className="font-display text-3xl">YOU ARE OFF THE LIST</p>
            <p className="font-body text-xs tracking-widest">
              NO MORE EMAILS. NO HARD FEELINGS
            </p>
          </div>
        ) : (
          // A button rather than a bare link target: mail scanners follow every
          // URL in an email, and a GET opt-out would let them unsubscribe
          // people who never clicked.
          <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="token" value={token} />
            <div className="flex flex-col gap-1">
              <p className="font-display text-2xl leading-tight sm:text-3xl">
                STOP THE EMAILS?
              </p>
              <p className="font-body text-xs tracking-widest">
                YOU WILL STOP HEARING ABOUT DROPS + ORDER STATUS
              </p>
            </div>

            {state.status === "error" ? (
              <p
                role="alert"
                className="font-body text-xs font-bold tracking-widest"
              >
                {failureMessages[state.reason]}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="border-2 border-current px-6 py-2 font-display text-xl tracking-wide transition-opacity hover:opacity-70 disabled:opacity-40"
            >
              {isPending ? "PROCESSING..." : "UNSUBSCRIBE"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
