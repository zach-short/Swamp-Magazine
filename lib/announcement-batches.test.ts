import { describe, expect, it } from "vitest";

import { buildUnsubscribeUrl, splitIntoBatches } from "./announcement-batches";

describe("splitIntoBatches", () => {
  it("fills whole batches and leaves the remainder in a short last one", () => {
    expect(splitIntoBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("splits an exact multiple without trailing an empty batch", () => {
    expect(splitIntoBatches([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("keeps every recipient exactly once, in order", () => {
    const recipients = Array.from({ length: 250 }, (_, index) => index);
    const batches = splitIntoBatches(recipients, 100);

    expect(batches).toHaveLength(3);
    expect(batches.map((batch) => batch.length)).toEqual([100, 100, 50]);
    expect(batches.flat()).toEqual(recipients);
  });

  it("sends nobody nothing", () => {
    expect(splitIntoBatches([], 100)).toEqual([]);
  });

  it("never exceeds the batch size", () => {
    const batches = splitIntoBatches(Array.from({ length: 101 }), 100);
    expect(Math.max(...batches.map((batch) => batch.length))).toBeLessThanOrEqual(
      100,
    );
  });

  it("refuses a batch size that would mean one unbounded call", () => {
    expect(() => splitIntoBatches([1, 2], 0)).toThrow(RangeError);
    expect(() => splitIntoBatches([1, 2], -1)).toThrow(RangeError);
    expect(() => splitIntoBatches([1, 2], 1.5)).toThrow(RangeError);
  });
});

describe("buildUnsubscribeUrl", () => {
  it("hangs the subscriber id off /unsubscribe", () => {
    expect(
      buildUnsubscribeUrl(
        "https://swampmagazine.com",
        "4e0e7f24-6c3f-4a3e-9f42-1b3f0a2c9d55",
      ),
    ).toBe(
      "https://swampmagazine.com/unsubscribe?id=4e0e7f24-6c3f-4a3e-9f42-1b3f0a2c9d55",
    );
  });

  it("does not double the slash when the origin carries one", () => {
    expect(buildUnsubscribeUrl("https://swampmagazine.com/", "abc")).toBe(
      "https://swampmagazine.com/unsubscribe?id=abc",
    );
  });
});
