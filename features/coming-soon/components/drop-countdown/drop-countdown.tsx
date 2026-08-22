"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { padUnit, splitRemaining, type CountdownParts } from "../../lib/countdown";

type DropCountdownProps = {
  /** Server-rendered target so the first paint already shows real digits. */
  targetIso: string;
};

export function DropCountdown({ targetIso }: DropCountdownProps) {
  const router = useRouter();
  const targetMs = new Date(targetIso).getTime();
  const [parts, setParts] = useState<CountdownParts>(() =>
    splitRemaining(targetMs - Date.now()),
  );
  const pulledLiveSite = useRef(false);

  useEffect(() => {
    // Only ever from the timer callback, never synchronously in the effect
    // body: the first tick is a second away and the initial state was already
    // computed from the same target, so there is nothing to catch up on.
    const interval = setInterval(
      () => setParts(splitRemaining(targetMs - Date.now())),
      1000,
    );
    return () => clearInterval(interval);
  }, [targetMs]);

  useEffect(() => {
    // The mode gate lives on the server, so zero here means the next request
    // returns the storefront -- fetch it instead of making the visitor reload.
    // Fires once: if the flip somehow doesn't take, this must not spin.
    if (!parts.done || pulledLiveSite.current) return;
    pulledLiveSite.current = true;
    router.refresh();
  }, [parts.done, router]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="font-body text-xs tracking-[0.35em]">DROPS IN</p>
      <time
        dateTime={targetIso}
        role="timer"
        aria-label="Time until the drop"
        className="flex items-start gap-4 sm:gap-6"
      >
        <Unit value={padUnit(parts.days)} label="DAYS" />
        <Unit value={padUnit(parts.hours)} label="HRS" />
        <Unit value={padUnit(parts.minutes)} label="MIN" />
        <Unit value={padUnit(parts.seconds)} label="SEC" />
      </time>
    </div>
  );
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col items-center gap-1">
      {/* The server renders the second it rendered in; the client hydrates a
          beat later and may already be one tick ahead. That drift is expected,
          not a bug worth a hydration error. */}
      <span
        suppressHydrationWarning
        className="font-display text-[clamp(2.5rem,10vw,5rem)] leading-none tabular-nums"
      >
        {value}
      </span>
      <span className="font-body text-[10px] tracking-[0.3em]">{label}</span>
    </span>
  );
}
