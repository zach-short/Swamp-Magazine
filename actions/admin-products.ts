"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveAdminAccess } from "@/features/admin/lib/admin-guard";
import { adminRoutes } from "@/features/admin/lib/admin-routes";
import {
  createProduct,
  createVariant,
  deleteProduct,
  deleteVariant,
  getProductSlug,
  getVariantProductSlug,
  updateProduct,
  updateVariant,
} from "@/features/admin/lib/products";
import { parseUsdToCents } from "@/lib/money";

export type AdminCatalogFailure =
  | "not-authorized"
  | "invalid-input"
  | "invalid-price"
  | "duplicate-slug"
  | "duplicate-size"
  | "server-error";

export type AdminCatalogResult =
  | { status: "success" }
  | { status: "error"; reason: AdminCatalogFailure };

/**
 * Price arrives as the string the founder typed, not a number. Parsing it
 * server-side through parseUsdToCents is what keeps "19.99" from becoming
 * 1998.9999999999998 cents somewhere between his thumb and the column.
 */
const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.string().trim().min(1).max(20),
  description: z.string().trim().max(2000),
  modelCredits: z.string().trim().max(200),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

// Lowercase, hyphenated, no leading/trailing hyphen: this becomes the public
// URL and the suffix of both image-slot keys, so it has to survive a link.
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

const variantSchema = z.object({
  size: z.string().trim().min(1).max(20),
  inventoryCount: z.number().int().min(0).max(100000),
  sortOrder: z.number().int().min(0).max(9999),
});

const idSchema = z.uuid();

export type ProductInput = z.input<typeof productSchema>;
export type VariantInput = z.input<typeof variantSchema>;

export async function saveProduct(
  id: string,
  input: ProductInput,
): Promise<AdminCatalogResult> {
  const gate = await authorize();
  if (gate) return gate;

  const parsedId = idSchema.safeParse(id);
  const parsed = productSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return { status: "error", reason: "invalid-input" };
  }

  const priceCents = parseUsdToCents(parsed.data.price);
  // The column is `check (price_cents > 0)`; a free product would be rejected
  // by Postgres, so it is named here instead of surfacing as "server error".
  if (priceCents === null || priceCents <= 0) {
    return { status: "error", reason: "invalid-price" };
  }

  const ok = await updateProduct(parsedId.data, {
    name: parsed.data.name,
    priceCents,
    description: emptyToNull(parsed.data.description),
    modelCredits: emptyToNull(parsed.data.modelCredits),
    active: parsed.data.active,
    sortOrder: parsed.data.sortOrder,
  });
  if (!ok) return { status: "error", reason: "server-error" };

  await revalidateCatalog(await getProductSlug(parsedId.data));
  return { status: "success" };
}

export async function addProduct(
  slug: string,
  input: ProductInput,
): Promise<AdminCatalogResult> {
  const gate = await authorize();
  if (gate) return gate;

  const parsedSlug = slugSchema.safeParse(slug);
  const parsed = productSchema.safeParse(input);
  if (!parsedSlug.success || !parsed.success) {
    return { status: "error", reason: "invalid-input" };
  }

  const priceCents = parseUsdToCents(parsed.data.price);
  if (priceCents === null || priceCents <= 0) {
    return { status: "error", reason: "invalid-price" };
  }

  const outcome = await createProduct({
    slug: parsedSlug.data,
    name: parsed.data.name,
    priceCents,
    description: emptyToNull(parsed.data.description),
    modelCredits: emptyToNull(parsed.data.modelCredits),
    active: parsed.data.active,
    sortOrder: parsed.data.sortOrder,
  });

  if (outcome === "duplicate-slug") {
    return { status: "error", reason: "duplicate-slug" };
  }
  if (outcome === "failed") return { status: "error", reason: "server-error" };

  await revalidateCatalog(parsedSlug.data);
  return { status: "success" };
}

export async function removeProduct(id: string): Promise<AdminCatalogResult> {
  const gate = await authorize();
  if (gate) return gate;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { status: "error", reason: "invalid-input" };

  // Read the slug before the row is gone -- afterwards there is nothing left
  // to derive the product path from, and its page would stay cached.
  const slug = await getProductSlug(parsedId.data);
  if (!(await deleteProduct(parsedId.data))) {
    return { status: "error", reason: "server-error" };
  }

  await revalidateCatalog(slug);
  return { status: "success" };
}

export async function saveVariant(
  id: string,
  input: VariantInput,
): Promise<AdminCatalogResult> {
  const gate = await authorize();
  if (gate) return gate;

  const parsedId = idSchema.safeParse(id);
  const parsed = variantSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return { status: "error", reason: "invalid-input" };
  }

  const slug = await getVariantProductSlug(parsedId.data);
  if (!(await updateVariant(parsedId.data, parsed.data))) {
    return { status: "error", reason: "server-error" };
  }

  await revalidateCatalog(slug);
  return { status: "success" };
}

export async function addVariant(
  productId: string,
  input: VariantInput,
): Promise<AdminCatalogResult> {
  const gate = await authorize();
  if (gate) return gate;

  const parsedId = idSchema.safeParse(productId);
  const parsed = variantSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return { status: "error", reason: "invalid-input" };
  }

  const outcome = await createVariant(parsedId.data, parsed.data);
  if (outcome === "duplicate-size") {
    return { status: "error", reason: "duplicate-size" };
  }
  if (outcome === "failed") return { status: "error", reason: "server-error" };

  await revalidateCatalog(await getProductSlug(parsedId.data));
  return { status: "success" };
}

export async function removeVariant(id: string): Promise<AdminCatalogResult> {
  const gate = await authorize();
  if (gate) return gate;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { status: "error", reason: "invalid-input" };

  const slug = await getVariantProductSlug(parsedId.data);
  if (!(await deleteVariant(parsedId.data))) {
    return { status: "error", reason: "server-error" };
  }

  await revalidateCatalog(slug);
  return { status: "success" };
}

async function authorize(): Promise<AdminCatalogResult | null> {
  const access = await resolveAdminAccess();
  return access.status === "ok"
    ? null
    : { status: "error", reason: "not-authorized" };
}

/** Trailing empty strings are absent values, not empty captions. */
function emptyToNull(value: string): string | null {
  return value.length > 0 ? value : null;
}

/**
 * PLAN P4 watch-for: a mutation the public site does not reflect makes the
 * founder distrust the admin. A price, a stock count and an active flag all
 * show on the landing grid and on the product page, so both are swept -- plus
 * the admin's own list, or the editor keeps rendering the value it replaced.
 */
async function revalidateCatalog(slug: string | null): Promise<void> {
  revalidatePath("/");
  if (slug) revalidatePath(`/product/${slug}`);
  revalidatePath(adminRoutes.products);
}
