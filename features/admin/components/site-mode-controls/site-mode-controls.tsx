"use client";

import { useCallback, useRef, useState, useTransition } from "react";

import {
  setDropAt,
  setSiteMode,
  type AdminSettingsFailure,
  type AdminSettingsResult,
} from "@/actions/admin-site-settings";
import type { SiteMode } from "@/lib/site-mode";

type SiteModeControlsProps = {
  mode: SiteMode;
  dropAt: string | null;
  /** The countdown has fired and is what is holding the store open. */
  dropAtFired: boolean;
};

type Feedback = { tone: "ok" | "bad"; text: string } | null;

type SettingsSuccess<T> = Extract<T, { status: "success" }>;

const failureText: Record<AdminSettingsFailure, string> = {
  "not-authorized": "YOUR SESSION EXPIRED. SIGN IN AGAIN",
  "invalid-input": "THAT DATE DIDN'T PARSE. TRY AGAIN",
  "server-error": "THE SAVE DIDN'T STICK. TRY AGAIN",
};

const buttonClasses =
  "w-full border-2 border-current px-4 py-3 font-display text-xl tracking-wide transition-opacity hover:opacity-70 disabled:opacity-40";

export function SiteModeControls({
  mode,
  dropAt,
  dropAtFired,
}: SiteModeControlsProps) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [armedToTakeDown, setArmedToTakeDown] = useState(false);
  const dropAtInput = useRef<HTMLInputElement | null>(null);

  // The field is uncontrolled and filled by this ref callback rather than from
  // a rendered value: datetime-local speaks the founder's wall clock, the
  // server only knows UTC, and a value rendered on the server would hydrate
  // into a different one on his phone. Ref callbacks never run during SSR, so
  // the timezone conversion happens where the timezone is actually known.
  // Re-runs whenever `dropAt` changes, i.e. after a save revalidates.
  const bindDropAtInput = useCallback(
    (node: HTMLInputElement | null) => {
      dropAtInput.current = node;
      if (node) node.value = dropAt ? toDateTimeLocal(dropAt) : "";
    },
    [dropAt],
  );

  // okText takes the result, not just a string, because closing the site can
  // do more than it says on the button -- the founder is told what actually
  // happened rather than what was requested.
  function run<T extends AdminSettingsResult>(
    action: () => Promise<T>,
    okText: string | ((success: SettingsSuccess<T>) => string),
  ) {
    setFeedback(null);
    startTransition(async () => {
      const result = await action();
      setFeedback(
        result.status === "success"
          ? {
              tone: "ok",
              text:
                typeof okText === "string"
                  ? okText
                  : okText(result as SettingsSuccess<T>),
            }
          : { tone: "bad", text: failureText[result.reason] },
      );
    });
  }

  const live = mode === "live";

  return (
    <section className="flex flex-col gap-6 border-2 border-current p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="font-body text-[10px] tracking-[0.3em]">THE SITE IS</p>
        <p className="font-display text-[clamp(2rem,10vw,3.5rem)] leading-none">
          {live ? "LIVE" : "COMING SOON"}
        </p>
        <p className="font-body text-xs tracking-widest opacity-70">
          {live
            ? "VISITORS SEE THE STORE AND CAN ORDER"
            : "VISITORS SEE THE SIGN-UP PAGE ONLY"}
        </p>
      </div>

      {live ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            className={buttonClasses}
            onClick={() => {
              // Two taps to take the store down. One stray thumb on a phone
              // should not close the shop.
              if (!armedToTakeDown) {
                setArmedToTakeDown(true);
                return;
              }
              setArmedToTakeDown(false);
              run(
                () => setSiteMode("coming_soon"),
                (success) =>
                  success.disarmedDropAt
                    ? "BACK TO COMING SOON. DROP TIME CLEARED"
                    : "BACK TO COMING SOON",
              );
            }}
          >
            {armedToTakeDown ? "TAP AGAIN TO CONFIRM" : "BACK TO COMING SOON"}
          </button>
          {dropAtFired ? (
            <p className="font-body text-[10px] tracking-widest opacity-70">
              THIS CLEARS THE DROP TIME TOO. IT ALREADY FIRED, AND THE SITE
              REOPENS ITSELF WHILE IT IS STILL SET
            </p>
          ) : null}
          {armedToTakeDown ? (
            <button
              type="button"
              className="font-body text-xs tracking-widest underline"
              onClick={() => setArmedToTakeDown(false)}
            >
              CANCEL
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          className={buttonClasses}
          onClick={() => run(() => setSiteMode("live"), "THE SITE IS LIVE")}
        >
          GO LIVE
        </button>
      )}

      <div className="flex flex-col gap-3 border-t-2 border-current pt-5">
        <div className="flex flex-col gap-1">
          <p className="font-display text-2xl leading-none">DROP TIME</p>
          <p className="font-body text-xs tracking-widest opacity-70">
            {dropAtFired
              ? "THE COUNTDOWN FIRED. IT IS WHAT IS KEEPING THE SITE OPEN"
              : dropAt
                ? "THE COUNTDOWN IS ARMED"
                : "NO COUNTDOWN. SET ONE OR LEAVE IT EMPTY"}
          </p>
        </div>

        <label className="flex flex-col gap-1 font-body text-[10px] tracking-widest">
          YOUR LOCAL TIME
          {/*
            min-w-0: iOS gives datetime-local an intrinsic width wider than this
            column, and a flex item's default min-width:auto lets that beat
            w-full — the field spills past the SET/CLEAR buttons without it.
            px-4 matches buttonClasses so the three stack to one edge.
          */}
          <input
            type="datetime-local"
            ref={bindDropAtInput}
            className="w-full min-w-0 border-2 border-current bg-transparent px-4 py-3 font-body text-base outline-none"
          />
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={pending}
            className={buttonClasses}
            onClick={() => {
              const iso = toIso(dropAtInput.current?.value ?? "");
              if (!iso) {
                setFeedback({ tone: "bad", text: "PICK A DATE AND TIME FIRST" });
                return;
              }
              run(() => setDropAt(iso), "DROP TIME SAVED");
            }}
          >
            SET
          </button>
          <button
            type="button"
            disabled={pending}
            className={buttonClasses}
            onClick={() => {
              if (dropAtInput.current) dropAtInput.current.value = "";
              run(() => setDropAt(null), "COUNTDOWN CLEARED");
            }}
          >
            CLEAR
          </button>
        </div>
      </div>

      {pending ? (
        <p className="font-body text-xs tracking-widest">SAVING...</p>
      ) : null}

      {feedback && !pending ? (
        <p
          role="status"
          className={`font-body text-xs font-bold tracking-widest ${
            feedback.tone === "ok" ? "" : "underline"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}
    </section>
  );
}

/** ISO instant -> the `YYYY-MM-DDTHH:mm` a datetime-local input expects. */
function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** datetime-local (wall clock, no zone) -> a UTC instant for the database. */
function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
