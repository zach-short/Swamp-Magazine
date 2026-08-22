export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the target has arrived -- the cue to pull the live site down. */
  done: boolean;
};

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Clamped at zero rather than allowed to go negative: the server flip and the
// client tick can disagree by a second or two around the drop, and a countdown
// reading "-1" in front of the founder's audience is worse than one that sits
// on 00 for a beat while the page refreshes itself.
export function splitRemaining(remainingMs: number): CountdownParts {
  const clamped = Math.max(0, remainingMs);

  return {
    days: Math.floor(clamped / DAY_MS),
    hours: Math.floor((clamped % DAY_MS) / HOUR_MS),
    minutes: Math.floor((clamped % HOUR_MS) / MINUTE_MS),
    seconds: Math.floor((clamped % MINUTE_MS) / SECOND_MS),
    done: clamped <= 0,
  };
}

// Two digits keeps the cell width steady between 9 and 10 in a face without
// tabular figures; days grow past 99 and are left alone.
export function padUnit(value: number): string {
  return value.toString().padStart(2, "0");
}
