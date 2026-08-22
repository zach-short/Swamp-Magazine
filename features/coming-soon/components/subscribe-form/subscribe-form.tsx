"use client";

import { useActionState } from "react";

import {
  subscribeToDrop,
  type SubscribeFailure,
  type SubscribeState,
} from "@/actions/subscribe";

const initialState: SubscribeState = { status: "idle" };

const failureMessages: Record<SubscribeFailure, string> = {
  "invalid-email": "THAT EMAIL DOESN'T LOOK RIGHT",
  "invalid-phone": "THAT PHONE NUMBER DOESN'T LOOK RIGHT",
  "server-error": "SOMETHING BROKE. TRY AGAIN",
};

const inputClasses =
  "border-b-2 border-current bg-transparent py-1 font-body text-base tracking-wide outline-none placeholder:text-current placeholder:opacity-40";

export function SubscribeForm() {
  const [state, formAction, isPending] = useActionState(
    subscribeToDrop,
    initialState,
  );

  // Post-submit state per the founder's thank-you mockup.
  if (state.status === "success") {
    return (
      <div className="flex w-full max-w-md flex-col gap-3 border-2 border-current p-8 text-center">
        <p className="font-display text-4xl">THANK YOU</p>
        <p className="font-body text-sm tracking-widest">
          SUBMISSION IS GETTING PROCESSED
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
          I WANT MY FINGER ON THE PULSE
        </p>
        <p className="font-body text-xs tracking-widest">
          UPDATE ME ON ORDER STATUS + NEW PRODUCTS (CANCEL ANY TIME)
        </p>
      </div>

      <label className="flex flex-col gap-1 font-body text-xs tracking-widest">
        EMAIL
        <input
          className={inputClasses}
          type="email"
          name="email"
          required
          autoComplete="email"
        />
      </label>

      <label className="flex flex-col gap-1 font-body text-xs tracking-widest">
        PHONE (OPTIONAL, FOR TEXTS)
        <input
          className={inputClasses}
          type="tel"
          name="phone"
          autoComplete="tel"
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
        className="border-2 border-current px-6 py-2 font-display text-xl tracking-wide transition-opacity hover:opacity-70 disabled:opacity-40"
      >
        {isPending ? "SENDING..." : "SUBMIT"}
      </button>

      <p className="font-body text-[10px] leading-relaxed opacity-70">
        BY SUBMITTING YOU AGREE TO GET EMAILS (AND TEXTS IF YOU LEAVE A NUMBER)
        ABOUT DROPS + YOUR ORDERS. CANCEL ANY TIME.
      </p>
    </form>
  );
}
