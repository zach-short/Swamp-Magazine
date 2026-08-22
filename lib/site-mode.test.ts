import { describe, expect, it } from "vitest";

import { resolveSiteMode } from "./site-mode";

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
