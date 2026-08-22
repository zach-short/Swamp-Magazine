// The image slots the storefront actually reads, named in one place.
//
// `features/storefront/lib/catalog.ts` looks up four shapes of key --
// landing_hero, landing_mascot, product_cutout:<slug>, product_bg:<slug> -- and
// a slot written under any other key is a file the site will never render. The
// admin therefore offers a closed list rather than a free-text key field.

export type SlotBucket = "products" | "slots";

export type SlotDefinition = {
  key: string;
  label: string;
  /** What the founder is choosing, in his terms, not the schema's. */
  hint: string;
  bucket: SlotBucket;
};

/** Slots that exist once for the whole site. */
export const LANDING_SLOTS: SlotDefinition[] = [
  {
    key: "landing_hero",
    label: "LANDING HERO",
    hint: "THE BIG SHOT ON THE FRONT PAGE",
    bucket: "slots",
  },
  {
    key: "landing_mascot",
    label: "LANDING MASCOT",
    hint: "THE CUT-OUT CHARACTER. LEAVE EMPTY TO HIDE IT",
    bucket: "slots",
  },
];

/**
 * The two slots every product carries. The cutout lands in the `products`
 * bucket and the background in `slots`, matching where the seed script put
 * them -- the bucket is part of the stored row, so a mismatch here would
 * write a file the storefront looks for somewhere else.
 */
export function productSlots(slug: string, name: string): SlotDefinition[] {
  return [
    {
      key: `product_cutout:${slug}`,
      label: `${name.toUpperCase()} -- CUTOUT`,
      hint: "THE PRODUCT ON ITS OWN, NO BACKGROUND",
      bucket: "products",
    },
    {
      key: `product_bg:${slug}`,
      label: `${name.toUpperCase()} -- BACKGROUND`,
      hint: "THE FULL-BLEED SHOT BEHIND THE PRODUCT PAGE",
      bucket: "slots",
    },
  ];
}

export function allSlotDefinitions(
  products: { slug: string; name: string }[],
): SlotDefinition[] {
  return [
    ...LANDING_SLOTS,
    ...products.flatMap((product) => productSlots(product.slug, product.name)),
  ];
}

/**
 * Where a freshly uploaded image is written.
 *
 * `version` is part of the filename on purpose. Supabase serves public objects
 * through a CDN and next/image caches on the URL, so overwriting a path in
 * place leaves the founder staring at the old picture -- the exact "I changed
 * it and nothing happened" the P4 brief warns about. A new path means a new
 * URL, which is the only reliable cache bust available here.
 */
export function slotStoragePath(
  slot: SlotDefinition,
  version: string,
): string {
  // Colons are legal in Supabase object keys but survive badly through URLs
  // and shells; the seed already flattened them and this keeps that shape.
  const base = slot.key.replace(/:/g, "-");
  return `${base}-${version}.webp`;
}

export function findSlotDefinition(
  definitions: SlotDefinition[],
  key: string,
): SlotDefinition | null {
  return definitions.find((slot) => slot.key === key) ?? null;
}
