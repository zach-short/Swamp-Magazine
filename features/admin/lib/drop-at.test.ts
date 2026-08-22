import { describe, expect, it } from "vitest";

import { hasDropAtFired } from "./drop-at";

const NOW = new Date("2026-09-01T12:00:00.000Z");
const PAST = "2026-08-31T12:00:00.000Z";
const FUTURE = "2026-09-02T12:00:00.000Z";

// The admin's half of the P5 precedence rule. This is the check that decides
// whether closing the site also disarms the countdown, so getting it wrong is a
// BD-5 silent failure of the loudest kind: the founder taps his toggle, the
// storefront stays open, and nothing anywhere says why.
describe("hasDropAtFired", () => {
  it("reports a passed drop time as holding the site open", () => {
    expect(hasDropAtFired(PAST, NOW)).toBe(true);
  });

  it("counts the exact drop instant as fired", () => {
    expect(hasDropAtFired(NOW.toISOString(), NOW)).toBe(true);
  });

  it("leaves a countdown that is still running alone", () => {
    // Closing the shop until Friday's drop must not cancel Friday.
    expect(hasDropAtFired(FUTURE, NOW)).toBe(false);
  });

  it("treats an unset or untrustworthy timestamp as not armed", () => {
    expect(hasDropAtFired(null, NOW)).toBe(false);
    expect(hasDropAtFired(undefined, NOW)).toBe(false);
    expect(hasDropAtFired("", NOW)).toBe(false);
    expect(hasDropAtFired("   ", NOW)).toBe(false);
    expect(hasDropAtFired("soon", NOW)).toBe(false);
    expect(hasDropAtFired(0, NOW)).toBe(false);
    expect(hasDropAtFired({}, NOW)).toBe(false);
    expect(hasDropAtFired(new Date("nope"), NOW)).toBe(false);
  });

  it("accepts a Date as well as the Postgres string", () => {
    expect(hasDropAtFired(new Date(PAST), NOW)).toBe(true);
    expect(hasDropAtFired(new Date(FUTURE), NOW)).toBe(false);
  });
});
