import { describe, expect, it } from "vitest";

import { dials } from "@/config/dials";
import { resolveOrderDraft, type ProductRow } from "./order-draft";

// These guards are the ones that lose money quietly: a sold-out size that still
// takes payment, or a shipped order charged at the pickup price.

function product(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "prod-1",
    slug: "vamp-tee",
    name: "Vamp Tee",
    price_cents: 2000,
    active: true,
    product_variants: [
      { id: "var-s", size: "S", inventory_count: 12 },
      { id: "var-m", size: "M", inventory_count: 0 },
    ],
    ...overrides,
  };
}

describe("resolveOrderDraft", () => {
  it("refuses a size with no stock", () => {
    expect(resolveOrderDraft(product(), "M", "pickup")).toEqual({
      status: "error",
      reason: "sold-out",
    });
  });

  it("refuses a size the product does not have", () => {
    expect(resolveOrderDraft(product(), "XXL", "pickup")).toEqual({
      status: "error",
      reason: "not-found",
    });
  });

  it("refuses a missing product", () => {
    expect(resolveOrderDraft(null, "S", "pickup")).toEqual({
      status: "error",
      reason: "not-found",
    });
  });

  it("refuses an inactive product without admitting it exists", () => {
    const result = resolveOrderDraft(
      product({ active: false }),
      "S",
      "pickup",
    );
    expect(result).toEqual({ status: "error", reason: "not-found" });
  });

  it("prices a pickup order at the product price with no shipping", () => {
    const result = resolveOrderDraft(product(), "S", "pickup");
    expect(result).toEqual({
      status: "success",
      draft: {
        productId: "prod-1",
        variantId: "var-s",
        productName: "Vamp Tee",
        size: "S",
        unitPriceCents: 2000,
        quantity: 1,
        shippingCents: 0,
        totalCents: 2000,
        delivery: "pickup",
      },
    });
  });

  it("adds exactly the shipping dial for a shipped order", () => {
    const result = resolveOrderDraft(product(), "S", "shipping");
    if (result.status !== "success") throw new Error("expected a draft");
    expect(result.draft.shippingCents).toBe(dials.shippingFlatRateCents);
    expect(result.draft.totalCents).toBe(2000 + dials.shippingFlatRateCents);
  });

  it("reads the price from the row, never from the caller", () => {
    const result = resolveOrderDraft(
      product({ price_cents: 2500 }),
      "S",
      "pickup",
    );
    if (result.status !== "success") throw new Error("expected a draft");
    expect(result.draft.unitPriceCents).toBe(2500);
  });
});
