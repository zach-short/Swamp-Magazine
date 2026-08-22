import { describe, expect, it } from "vitest";

import { parseDropAt, resolveSiteMode } from "./site-mode";

const NOW = new Date("2026-09-01T12:00:00.000Z");
const PAST = "2026-08-31T12:00:00.000Z";
const FUTURE = "2026-09-02T12:00:00.000Z";

// BD-5: the mode gate is one of the named silent-failure spots -- a wrong
// resolution here shows the wrong site, so the mapping is pinned.
describe("resolveSiteMode", () => {
  it("resolves live only for the exact value", () => {
    expect(resolveSiteMode("live")).toBe("live");
  });

  it("fails closed to coming_soon for everything else", () => {
    expect(resolveSiteMode("coming_soon")).toBe("coming_soon");
    expect(resolveSiteMode("LIVE")).toBe("coming_soon");
    expect(resolveSiteMode(undefined)).toBe("coming_soon");
    expect(resolveSiteMode(null)).toBe("coming_soon");
    expect(resolveSiteMode(1)).toBe("coming_soon");
    expect(resolveSiteMode("")).toBe("coming_soon");
  });
});

// P5 auto-flip. The precedence rule is the product decision under test, not an
// implementation detail: manual live wins, a fired drop_at wins over a stored
// coming_soon, and anything unparseable leaves the site closed.
describe("resolveSiteMode with an armed drop_at", () => {
  it("flips to live once the drop timestamp has passed", () => {
    expect(resolveSiteMode("coming_soon", PAST, NOW)).toBe("live");
  });

  it("treats the exact drop instant as live", () => {
    expect(resolveSiteMode("coming_soon", NOW.toISOString(), NOW)).toBe("live");
  });

  it("stays closed while the drop is still in the future", () => {
    expect(resolveSiteMode("coming_soon", FUTURE, NOW)).toBe("coming_soon");
  });

  it("keeps a manual live flip live regardless of the timestamp", () => {
    expect(resolveSiteMode("live", FUTURE, NOW)).toBe("live");
    expect(resolveSiteMode("live", null, NOW)).toBe("live");
    expect(resolveSiteMode("live", "nonsense", NOW)).toBe("live");
  });

  it("lets a fired drop_at override a stored coming_soon and a junk mode", () => {
    // The armed timestamp is the instruction; the row is only ever going to say
    // coming_soon while a countdown runs, so it cannot be allowed to veto.
    expect(resolveSiteMode("LIVE", PAST, NOW)).toBe("live");
    expect(resolveSiteMode(undefined, PAST, NOW)).toBe("live");
  });

  it("ignores a drop_at it cannot trust", () => {
    expect(resolveSiteMode("coming_soon", "soon", NOW)).toBe("coming_soon");
    expect(resolveSiteMode("coming_soon", "", NOW)).toBe("coming_soon");
    expect(resolveSiteMode("coming_soon", 0, NOW)).toBe("coming_soon");
    expect(resolveSiteMode("coming_soon", {}, NOW)).toBe("coming_soon");
    expect(resolveSiteMode("coming_soon", new Date("nope"), NOW)).toBe(
      "coming_soon",
    );
  });

  it("accepts a Date as well as the Postgres string", () => {
    expect(resolveSiteMode("coming_soon", new Date(PAST), NOW)).toBe("live");
    expect(resolveSiteMode("coming_soon", new Date(FUTURE), NOW)).toBe(
      "coming_soon",
    );
  });
});

describe("parseDropAt", () => {
  it("parses the timestamptz shape Postgres returns", () => {
    expect(parseDropAt("2026-09-01T12:00:00+00:00")?.toISOString()).toBe(
      "2026-09-01T12:00:00.000Z",
    );
  });

  it("returns null for anything that is not an armed timestamp", () => {
    expect(parseDropAt(null)).toBeNull();
    expect(parseDropAt(undefined)).toBeNull();
    expect(parseDropAt("   ")).toBeNull();
    expect(parseDropAt("later")).toBeNull();
    expect(parseDropAt(1756728000000)).toBeNull();
  });
});
