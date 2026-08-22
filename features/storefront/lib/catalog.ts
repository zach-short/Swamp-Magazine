import { createClient } from "@/lib/supabase/server";

// Storefront data layer. Reads go through the anon server client, so RLS is
// the source of truth for what's visible (active products only). All lookups
// fail soft -- a broken read renders an empty grid / 404, never a crash --
// matching the mode gate's posture.

export type SlotImage = { url: string; alt: string };

export type ProductVariant = { size: string; soldOut: boolean };

export type CatalogProduct = {
  slug: string;
  name: string;
  priceCents: number;
  modelCredits: string | null;
  cutout: SlotImage | null;
  variants: ProductVariant[];
};

export type ProductDetail = CatalogProduct & { background: SlotImage | null };

export type LandingImagery = { hero: SlotImage | null; mascot: SlotImage | null };

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type SlotRow = {
  slot_key: string;
  bucket: string;
  storage_path: string;
  alt: string | null;
};

type ProductRow = {
  slug: string;
  name: string;
  price_cents: number;
  model_credits: string | null;
  product_variants: { size: string; inventory_count: number; sort_order: number }[];
};

const PRODUCT_SELECT =
  "slug, name, price_cents, model_credits, product_variants(size, inventory_count, sort_order)";

export async function getCatalog(): Promise<CatalogProduct[]> {
  try {
    const supabase = await createClient();
    const [products, slots] = await Promise.all([
      supabase.from("products").select(PRODUCT_SELECT).order("sort_order"),
      getSlotMap(supabase),
    ]);
    if (products.error) {
      console.error("[CATALOG]", products.error.code, products.error.message);
      return [];
    }
    return ((products.data ?? []) as ProductRow[]).map((row) =>
      toCatalogProduct(row, slots),
    );
  } catch (error) {
    console.error("[CATALOG]", error);
    return [];
  }
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  try {
    const supabase = await createClient();
    const [product, slots] = await Promise.all([
      supabase.from("products").select(PRODUCT_SELECT).eq("slug", slug).maybeSingle(),
      getSlotMap(supabase),
    ]);
    if (product.error) {
      console.error("[PRODUCT]", product.error.code, product.error.message);
      return null;
    }
    if (!product.data) return null;
    const row = product.data as ProductRow;
    return {
      ...toCatalogProduct(row, slots),
      background: slots.get(`product_bg:${row.slug}`) ?? null,
    };
  } catch (error) {
    console.error("[PRODUCT]", error);
    return null;
  }
}

// landing_hero / landing_mascot are founder-upload slots (P4 admin). Until
// they exist, the hero falls back to the one clean lifestyle shot in the
// archive and the mascot slot renders nothing.
export async function getLandingImagery(): Promise<LandingImagery> {
  try {
    const supabase = await createClient();
    const slots = await getSlotMap(supabase);
    return {
      hero: slots.get("landing_hero") ?? slots.get("product_bg:star-shorts") ?? null,
      mascot: slots.get("landing_mascot") ?? null,
    };
  } catch (error) {
    console.error("[LANDING_IMAGERY]", error);
    return { hero: null, mascot: null };
  }
}

// The whole slot table is a handful of rows; one read serves every lookup.
async function getSlotMap(
  supabase: SupabaseServerClient,
): Promise<Map<string, SlotImage>> {
  const { data, error } = await supabase
    .from("image_slots")
    .select("slot_key, bucket, storage_path, alt");
  if (error) {
    console.error("[IMAGE_SLOTS]", error.code, error.message);
    return new Map();
  }
  const map = new Map<string, SlotImage>();
  for (const row of (data ?? []) as SlotRow[]) {
    const { data: publicUrl } = supabase.storage
      .from(row.bucket)
      .getPublicUrl(row.storage_path);
    map.set(row.slot_key, { url: publicUrl.publicUrl, alt: row.alt ?? "" });
  }
  return map;
}

function toCatalogProduct(
  row: ProductRow,
  slots: Map<string, SlotImage>,
): CatalogProduct {
  return {
    slug: row.slug,
    name: row.name,
    priceCents: row.price_cents,
    modelCredits: row.model_credits,
    cutout: slots.get(`product_cutout:${row.slug}`) ?? null,
    variants: [...row.product_variants]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((variant) => ({
        size: variant.size,
        soldOut: variant.inventory_count <= 0,
      })),
  };
}
