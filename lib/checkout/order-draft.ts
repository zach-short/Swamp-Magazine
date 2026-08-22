import type {
  CreateCheckoutSessionResult,
  DeliveryMethod,
} from "@/actions/create-checkout-session";
import { dials } from "@/config/dials";

// The pure half of createCheckoutSession: given rows already read from the DB,
// decide whether this is a sellable order and what it costs. Pulled out of the
// server action so the guards that lose money when they are wrong -- sold-out
// rejection, price and shipping arithmetic -- are testable without Stripe keys
// or a database (BD-5).
//
// The DeliveryMethod type is imported from the action rather than redeclared so
// the frozen E-to-F contract stays the single source of truth; it is a type-only
// import, so nothing from the "use server" module survives into this bundle.

export type VariantRow = {
  id: string;
  size: string;
  inventory_count: number;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  active: boolean;
  product_variants: VariantRow[];
};

export type OrderDraft = {
  productId: string;
  variantId: string;
  productName: string;
  size: string;
  unitPriceCents: number;
  quantity: number;
  shippingCents: number;
  totalCents: number;
  delivery: DeliveryMethod;
};

type FailureReason = Extract<
  CreateCheckoutSessionResult,
  { status: "error" }
>["reason"];

export type OrderDraftResult =
  | { status: "success"; draft: OrderDraft }
  | { status: "error"; reason: FailureReason };

// One item per order (BD-4); the quantity column exists for the reserved cart
// seam, so the arithmetic below is written against it rather than assuming 1.
const QUANTITY = 1;

export function resolveOrderDraft(
  product: ProductRow | null,
  size: string,
  delivery: DeliveryMethod,
): OrderDraftResult {
  // An inactive product is invisible to the storefront's RLS policy, so reaching
  // here with one means a stale tab or a hand-made request -- same answer either
  // way, and deliberately not a distinct reason that would confirm it exists.
  if (!product || !product.active) {
    return { status: "error", reason: "not-found" };
  }

  const variant = product.product_variants.find((row) => row.size === size);
  if (!variant) {
    return { status: "error", reason: "not-found" };
  }

  if (variant.inventory_count < QUANTITY) {
    return { status: "error", reason: "sold-out" };
  }

  const shippingCents =
    delivery === "shipping" ? dials.shippingFlatRateCents : 0;
  const unitPriceCents = product.price_cents;

  return {
    status: "success",
    draft: {
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      size: variant.size,
      unitPriceCents,
      quantity: QUANTITY,
      shippingCents,
      totalCents: unitPriceCents * QUANTITY + shippingCents,
      delivery,
    },
  };
}
