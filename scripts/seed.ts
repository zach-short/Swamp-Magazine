// Seed: real catalog from swamp-images/ (BD-6). Masters are resized to
// <=2000px WebP with sharp, uploaded to Storage, and registered in the
// catalog tables + image_slots. Idempotent and safe to re-run: existing rows
// are never overwritten, so founder edits (prices, stock, swapped images)
// survive a re-seed.
//
// Catalog facts come from the founder's mockups (sizes + "PLEASE VENMO $NN"
// prices, read 2026-08-22). Inventory counts are PLACEHOLDERS -- the founder
// sets real stock before launch (P5 checklist).
//
// Run: bun run seed   (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY
// in .env.local; bun loads it automatically)

import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { z } from "zod";

const MAX_DIMENSION_PX = 2000;
const WEBP_QUALITY = 82;
const PLACEHOLDER_INVENTORY = 12;

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

type SeedProduct = {
  slug: string;
  name: string;
  priceCents: number;
  sizes: string[];
  modelCredits: string | null;
  cutoutFile: string;
  sortOrder: number;
};

const CATALOG: SeedProduct[] = [
  {
    slug: "vamp-tee",
    name: "Vamp Tee",
    priceCents: 2000,
    sizes: ["XS", "S", "M", "L", "XL"],
    modelCredits: "KIRBY-ANA (BEHIND)",
    cutoutFile: "swamp-images/VAMP GRID - AUG 9.png",
    sortOrder: 0,
  },
  {
    slug: "star-shorts",
    name: "Star Shorts",
    priceCents: 2500,
    sizes: ["S", "M", "L"],
    modelCredits: "MIA (L), DAVID (R)",
    cutoutFile: "STAR SHORTS GRID - AUG 9.png",
    sortOrder: 1,
  },
  {
    slug: "college-arch",
    name: "College Arch",
    priceCents: 2500,
    sizes: ["XS", "S", "M", "L"],
    modelCredits: "ANANYA (L), JESSICA (R)",
    cutoutFile: "swamp-images/COLLEGE ARCH GRID - AUG 9.png",
    sortOrder: 2,
  },
  {
    slug: "lurker-tee",
    name: "Lurker Tee",
    priceCents: 2500,
    sizes: ["XS", "S", "M", "L", "XL"],
    modelCredits: "JOE (BEHIND)",
    cutoutFile: "swamp-images/LURKER GRID - AUG 9.png",
    sortOrder: 3,
  },
];

// The only clean (no baked-in mockup text) lifestyle shot in the archive.
const LIFESTYLE_SLOTS = [
  {
    slotKey: "product_bg:star-shorts",
    file: "swamp-images/SHORTS GRID BACKGROUND SS.png",
    alt: "Star Shorts lifestyle shot",
  },
];

const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
  })
  .parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function resizeToWebp(file: string): Promise<Buffer> {
  return sharp(path.join(REPO_ROOT, file))
    .resize(MAX_DIMENSION_PX, MAX_DIMENSION_PX, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function uploadWebp(bucket: string, storagePath: string, file: string) {
  const body = await resizeToWebp(file);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, body, { contentType: "image/webp", upsert: true });
  if (error) throw new Error(`upload ${bucket}/${storagePath}: ${error.message}`);
  console.log(`  uploaded ${bucket}/${storagePath} (${Math.round(body.byteLength / 1024)} KB)`);
}

async function registerSlot(slotKey: string, bucket: string, storagePath: string, alt: string) {
  // ignoreDuplicates keeps founder-swapped images intact on re-run.
  const { error } = await supabase
    .from("image_slots")
    .upsert(
      { slot_key: slotKey, bucket, storage_path: storagePath, alt },
      { onConflict: "slot_key", ignoreDuplicates: true },
    );
  if (error) throw new Error(`image_slots ${slotKey}: ${error.message}`);
}

async function seedProduct(product: SeedProduct) {
  console.log(`${product.name}:`);

  const existing = await supabase
    .from("products")
    .select("id")
    .eq("slug", product.slug)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  let productId = existing.data?.id as string | undefined;
  if (productId) {
    console.log("  product exists, leaving row untouched");
  } else {
    const inserted = await supabase
      .from("products")
      .insert({
        slug: product.slug,
        name: product.name,
        price_cents: product.priceCents,
        model_credits: product.modelCredits,
        sort_order: product.sortOrder,
      })
      .select("id")
      .single();
    if (inserted.error) throw new Error(inserted.error.message);
    productId = inserted.data.id;
    console.log(`  inserted product (${product.priceCents / 100} USD)`);
  }

  const { error: variantError } = await supabase.from("product_variants").upsert(
    product.sizes.map((size, index) => ({
      product_id: productId,
      size,
      inventory_count: PLACEHOLDER_INVENTORY,
      sort_order: index,
    })),
    { onConflict: "product_id,size", ignoreDuplicates: true },
  );
  if (variantError) throw new Error(variantError.message);
  console.log(`  variants: ${product.sizes.join(", ")}`);

  const storagePath = `${product.slug}/cutout.webp`;
  await uploadWebp("products", storagePath, product.cutoutFile);
  await registerSlot(
    `product_cutout:${product.slug}`,
    "products",
    storagePath,
    `${product.name} product shot`,
  );
}

for (const product of CATALOG) {
  await seedProduct(product);
}

for (const slot of LIFESTYLE_SLOTS) {
  const storagePath = `${slot.slotKey.replace(/[:]/g, "-")}.webp`;
  await uploadWebp("slots", storagePath, slot.file);
  await registerSlot(slot.slotKey, "slots", storagePath, slot.alt);
}

console.log("seed complete");
