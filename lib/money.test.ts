import { describe, expect, it } from "vitest";

import { formatUsd, parseUsdToCents } from "./money";

describe("formatUsd", () => {
  it("prices whole dollars without cents, the way the mockups do", () => {
    expect(formatUsd(2000)).toBe("$20");
    expect(formatUsd(0)).toBe("$0");
  });

  it("keeps cents when the price actually carries them", () => {
    expect(formatUsd(2250)).toBe("$22.50");
    expect(formatUsd(1999)).toBe("$19.99");
    expect(formatUsd(5)).toBe("$0.05");
  });

  it("signs a negative amount rather than mangling it", () => {
    // Refund lines are the only place this shows up, but "$-20" reads as junk.
    expect(formatUsd(-2000)).toBe("-$20");
    expect(formatUsd(-1999)).toBe("-$19.99");
  });
});

describe("parseUsdToCents", () => {
  it("reads what the founder is likely to type", () => {
    expect(parseUsdToCents("20")).toBe(2000);
    expect(parseUsdToCents("$20")).toBe(2000);
    expect(parseUsdToCents(" 20 ")).toBe(2000);
    expect(parseUsdToCents("20.5")).toBe(2050);
    expect(parseUsdToCents("20.50")).toBe(2050);
    expect(parseUsdToCents("1,200")).toBe(120000);
  });

  it("keeps the cents exact where a float would not", () => {
    // 19.99 * 100 is 1998.9999999999998 in IEEE-754. The whole reason this
    // function parses strings instead of multiplying.
    expect(parseUsdToCents("19.99")).toBe(1999);
    expect(parseUsdToCents("0.07")).toBe(7);
    expect(parseUsdToCents("8.29")).toBe(829);
  });

  it("refuses anything that is not a plain price", () => {
    // A typo has to fail loudly. Rounding it into a real price is how the
    // storefront ends up charging a number nobody chose.
    expect(parseUsdToCents("")).toBeNull();
    expect(parseUsdToCents("abc")).toBeNull();
    expect(parseUsdToCents("-20")).toBeNull();
    expect(parseUsdToCents("20.")).toBeNull();
    expect(parseUsdToCents("20.999")).toBeNull();
    expect(parseUsdToCents("2 0")).toBeNull();
    expect(parseUsdToCents("$")).toBeNull();
    expect(parseUsdToCents("1e3")).toBeNull();
  });
});
