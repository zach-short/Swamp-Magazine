import { describe, expect, it } from "vitest";

import { formatUsd, orderErrorLines } from "./order-copy";

describe("formatUsd", () => {
  it("prices in whole dollars like the mockups", () => {
    expect(formatUsd(2000)).toBe("$20");
    expect(formatUsd(2500)).toBe("$25");
    expect(formatUsd(500)).toBe("$5");
  });

  it("keeps cents when a price actually has them", () => {
    expect(formatUsd(2250)).toBe("$22.50");
    expect(formatUsd(1)).toBe("$0.01");
  });
});

describe("orderErrorLines", () => {
  // Every reason in the frozen E<->F contract has to reach the buyer as words;
  // a silently unhandled failure is the one outcome this form can't have.
  it("has a line for every failure reason", () => {
    expect(Object.values(orderErrorLines).every((line) => line.length > 0)).toBe(
      true,
    );
    expect(Object.keys(orderErrorLines).sort()).toEqual([
      "invalid-input",
      "not-found",
      "server-error",
      "sold-out",
      "stripe-unconfigured",
    ]);
  });
});
