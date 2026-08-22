import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Catalog reads and writes for the admin.
//
// Deliberately the service-role client, not the storefront's anon one: the
// public RLS policy exposes active products only, and an admin that cannot see
// the thing it just deactivated is an admin the founder cannot use. Every write
// in this file is reachable only from an action that has already cleared
// requireAdmin/resolveAdminAccess.

export type AdminVariant = {
  id: string;
  size: string;
  inventoryCount: number;
  sortOrder: number;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  description: string | null;
  modelCredits: string | null;
  active: boolean;
  sortOrder: number;
  variants: AdminVariant[];
};

type VariantRow = {
  id: string;
  size: string;
  inventory_count: number;
  sort_order: number;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  description: string | null;
  model_credits: string | null;
  active: boolean;
  sort_order: number;
  product_variants: VariantRow[];
};

// One string literal, never a concatenation: postgrest-js parses this at the
// type level to shape `data`, and a `string` built with `+` collapses that
// inference into GenericStringError.
const SELECT =
  "id, slug, name, price_cents, description, model_credits, active, sort_order, product_variants(id, size, inventory_count, sort_order)";

/**
 * Every product, active or not, newest ordering first. `null` means the read
 * failed -- the screen says so rather than rendering an empty catalog that
 * looks like the founder deleted his own store.
 */
export async function getAdminProducts(): Promise<AdminProduct[] | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select(SELECT)
      .order("sort_order");

    if (error) {
      console.error("[ADMIN_PRODUCTS]", error.code, error.message);
      return null;
    }
    return ((data ?? []) as ProductRow[]).map(toAdminProduct);
  } catch (error) {
    console.error("[ADMIN_PRODUCTS]", error);
    return null;
  }
}

/** Just the identity fields, for screens that only need to name a product. */
export async function getProductIndex(): Promise<
  { slug: string; name: string }[] | null
> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("slug, name")
      .order("sort_order");

    if (error) {
      console.error("[ADMIN_PRODUCT_INDEX]", error.code, error.message);
      return null;
    }
    return (data ?? []) as { slug: string; name: string }[];
  } catch (error) {
    console.error("[ADMIN_PRODUCT_INDEX]", error);
    return null;
  }
}

export type ProductPatch = {
  name: string;
  priceCents: number;
  description: string | null;
  modelCredits: string | null;
  active: boolean;
  sortOrder: number;
};

/** Writes the editable product fields. `slug` is not among them -- see below. */
export async function updateProduct(
  id: string,
  patch: ProductPatch,
): Promise<boolean> {
  return run("[ADMIN_PRODUCT_UPDATE]", async (supabase) =>
    supabase
      .from("products")
      .update({
        name: patch.name,
        price_cents: patch.priceCents,
        description: patch.description,
        model_credits: patch.modelCredits,
        active: patch.active,
        sort_order: patch.sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id),
  );
}

export type NewProduct = ProductPatch & { slug: string };

/**
 * Creates a product. The slug is settable here and nowhere else: it is the
 * public URL, the image-slot key suffix, and what any shared link points at, so
 * changing it later would 404 the link and orphan both slot rows. Getting it
 * right once is cheaper than a rename that quietly breaks three things.
 */
export type CreateProductOutcome = "created" | "duplicate-slug" | "failed";

export async function createProduct(
  input: NewProduct,
): Promise<CreateProductOutcome> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("products").insert({
      slug: input.slug,
      name: input.name,
      price_cents: input.priceCents,
      description: input.description,
      model_credits: input.modelCredits,
      active: input.active,
      sort_order: input.sortOrder,
    });

    if (error) {
      console.error("[ADMIN_PRODUCT_CREATE]", error.code, error.message);
      // 23505 is Postgres' unique violation. Reported separately so the founder
      // is told the handle is taken rather than "something broke" -- the unique
      // index is the check, not a pre-read, which two tabs could race past.
      return error.code === "23505" ? "duplicate-slug" : "failed";
    }
    return "created";
  } catch (error) {
    console.error("[ADMIN_PRODUCT_CREATE]", error);
    return "failed";
  }
}

/**
 * Hard delete. `product_variants` cascades, and `order_items.product_id` is ON
 * DELETE SET NULL with the name and price copied onto the row at purchase time,
 * so past orders keep reading correctly after the product is gone.
 */
export async function deleteProduct(id: string): Promise<boolean> {
  return run("[ADMIN_PRODUCT_DELETE]", async (supabase) =>
    supabase.from("products").delete().eq("id", id),
  );
}

export type VariantPatch = {
  size: string;
  inventoryCount: number;
  sortOrder: number;
};

export type CreateVariantOutcome = "created" | "duplicate-size" | "failed";

/** `unique (product_id, size)` means a repeated size is a real, nameable error. */
export async function createVariant(
  productId: string,
  patch: VariantPatch,
): Promise<CreateVariantOutcome> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      size: patch.size,
      inventory_count: patch.inventoryCount,
      sort_order: patch.sortOrder,
    });

    if (error) {
      console.error("[ADMIN_VARIANT_CREATE]", error.code, error.message);
      return error.code === "23505" ? "duplicate-size" : "failed";
    }
    return "created";
  } catch (error) {
    console.error("[ADMIN_VARIANT_CREATE]", error);
    return "failed";
  }
}

export async function updateVariant(
  id: string,
  patch: VariantPatch,
): Promise<boolean> {
  return run("[ADMIN_VARIANT_UPDATE]", async (supabase) =>
    supabase
      .from("product_variants")
      .update({
        size: patch.size,
        inventory_count: patch.inventoryCount,
        sort_order: patch.sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id),
  );
}

export async function deleteVariant(id: string): Promise<boolean> {
  return run("[ADMIN_VARIANT_DELETE]", async (supabase) =>
    supabase.from("product_variants").delete().eq("id", id),
  );
}

/** The slug of the product a variant belongs to, for targeted revalidation. */
export async function getVariantProductSlug(
  variantId: string,
): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("product_variants")
      .select("products(slug)")
      .eq("id", variantId)
      .maybeSingle();

    if (error) {
      console.error("[ADMIN_VARIANT_SLUG]", error.code, error.message);
      return null;
    }
    // PostgREST types an embedded to-one as an array; the runtime shape is the
    // object. Narrowed here rather than trusting either guess.
    const products = (data as { products?: unknown } | null)?.products;
    const row = Array.isArray(products) ? products[0] : products;
    const slug = (row as { slug?: unknown } | undefined)?.slug;
    return typeof slug === "string" ? slug : null;
  } catch (error) {
    console.error("[ADMIN_VARIANT_SLUG]", error);
    return null;
  }
}

export async function getProductSlug(id: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[ADMIN_PRODUCT_SLUG]", error.code, error.message);
      return null;
    }
    return typeof data?.slug === "string" ? data.slug : null;
  } catch (error) {
    console.error("[ADMIN_PRODUCT_SLUG]", error);
    return null;
  }
}

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

/** Every write here has the same shape: log the real reason, return a boolean. */
async function run(
  tag: string,
  query: (
    supabase: SupabaseAdminClient,
  ) => Promise<{ error: { code?: string; message: string } | null }>,
): Promise<boolean> {
  try {
    const { error } = await query(createAdminClient());
    if (error) {
      console.error(tag, error.code, error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error(tag, error);
    return false;
  }
}

function toAdminProduct(row: ProductRow): AdminProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceCents: row.price_cents,
    description: row.description,
    modelCredits: row.model_credits,
    active: row.active,
    sortOrder: row.sort_order,
    variants: [...(row.product_variants ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((variant) => ({
        id: variant.id,
        size: variant.size,
        inventoryCount: variant.inventory_count,
        sortOrder: variant.sort_order,
      })),
  };
}
