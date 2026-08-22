import { describe, expect, it } from "vitest";

import { padUnit, splitRemaining } from "./countdown";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("splitRemaining", () => {
  it("splits a span into whole days, hours, minutes and seconds", () => {
    expect(splitRemaining(2 * DAY + 3 * HOUR + 4 * MINUTE + 5 * SECOND)).toEqual(
      { days: 2, hours: 3, minutes: 4, seconds: 5, done: false },
    );
  });

  it("drops sub-second remainder instead of rounding up", () => {
    expect(splitRemaining(1999).seconds).toBe(1);
  });

  it("is done at zero and stays clamped for a target already passed", () => {
    expect(splitRemaining(0)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      done: true,
    });
    expect(splitRemaining(-5 * DAY)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      done: true,
    });
  });

  it("is not done one millisecond out", () => {
    expect(splitRemaining(1).done).toBe(false);
  });
});

describe("padUnit", () => {
  it("pads single digits and leaves wider numbers alone", () => {
    expect(padUnit(0)).toBe("00");
    expect(padUnit(9)).toBe("09");
    expect(padUnit(42)).toBe("42");
    expect(padUnit(365)).toBe("365");
  });
});
