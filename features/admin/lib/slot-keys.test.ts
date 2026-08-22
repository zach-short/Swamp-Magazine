import { describe, expect, it } from "vitest";

import {
  LANDING_SLOTS,
  allSlotDefinitions,
  findSlotDefinition,
  productSlots,
  slotStoragePath,
} from "./slot-keys";

const PRODUCTS = [
  { slug: "star-shorts", name: "Star Shorts" },
  { slug: "vamp-tee", name: "Vamp Tee" },
];

// A slot written under a key the storefront does not read is an upload the
// founder will never see land -- the failure the P4 brief calls out by name.
describe("slot keys", () => {
  it("uses exactly the keys the storefront looks up", () => {
    // catalog.ts reads landing_hero, landing_mascot, product_cutout:<slug>
    // and product_bg:<slug>. Drift here is an invisible upload.
    const keys = allSlotDefinitions(PRODUCTS).map((slot) => slot.key);
    expect(keys).toEqual([
      "landing_hero",
      "landing_mascot",
      "product_cutout:star-shorts",
      "product_bg:star-shorts",
      "product_cutout:vamp-tee",
      "product_bg:vamp-tee",
    ]);
  });

  it("puts cutouts in the products bucket and everything else in slots", () => {
    // The bucket is stored on the row, so writing to the wrong one leaves the
    // storefront looking somewhere the file is not.
    const [cutout, background] = productSlots("star-shorts", "Star Shorts");
    expect(cutout.bucket).toBe("products");
    expect(background.bucket).toBe("slots");
    expect(LANDING_SLOTS.every((slot) => slot.bucket === "slots")).toBe(true);
  });

  it("offers only the landing slots when there are no products", () => {
    expect(allSlotDefinitions([])).toEqual(LANDING_SLOTS);
  });
});

describe("slotStoragePath", () => {
  const [cutout] = productSlots("star-shorts", "Star Shorts");

  it("versions the filename so the URL actually changes", () => {
    // Overwriting in place leaves the CDN and next/image serving the old
    // image, which reads to the founder as "nothing happened".
    expect(slotStoragePath(cutout, "abc123")).toBe(
      "product_cutout-star-shorts-abc123.webp",
    );
  });

  it("produces a different path for every version", () => {
    expect(slotStoragePath(cutout, "one")).not.toBe(
      slotStoragePath(cutout, "two"),
    );
  });

  it("flattens the colon out of the object key", () => {
    expect(slotStoragePath(cutout, "v")).not.toContain(":");
  });

  it("leaves a landing slot key alone apart from the version", () => {
    expect(slotStoragePath(LANDING_SLOTS[0], "v1")).toBe(
      "landing_hero-v1.webp",
    );
  });
});

describe("findSlotDefinition", () => {
  const definitions = allSlotDefinitions(PRODUCTS);

  it("finds a slot the admin offers", () => {
    expect(findSlotDefinition(definitions, "landing_hero")?.key).toBe(
      "landing_hero",
    );
  });

  it("refuses a key that is not on the closed list", () => {
    // This is what keeps the upload action from writing arbitrary keys.
    expect(findSlotDefinition(definitions, "product_cutout:nope")).toBeNull();
    expect(findSlotDefinition(definitions, "../etc/passwd")).toBeNull();
    expect(findSlotDefinition(definitions, "")).toBeNull();
  });
});
