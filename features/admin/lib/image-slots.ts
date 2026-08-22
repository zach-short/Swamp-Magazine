import "server-only";

import sharp from "sharp";

import { dials } from "@/config/dials";
import { createAdminClient } from "@/lib/supabase/admin";

import { slotStoragePath, type SlotDefinition } from "./slot-keys";

// The image-slot manager's data layer: read what is registered, and swap an
// image for a new one.
//
// Writes go through the service-role client rather than storage RLS policies.
// The P4 brief asks for storage writes scoped to the allowlist rather than to
// any authenticated user; routing every write through a server action that has
// already cleared the admin guard is strictly tighter than a policy -- a
// signed-in non-admin has no path here at all, with or without a bucket policy.

export type RegisteredSlot = {
  key: string;
  bucket: string;
  storagePath: string;
  url: string;
  alt: string | null;
  updatedAt: string;
};

type SlotRow = {
  slot_key: string;
  bucket: string;
  storage_path: string;
  alt: string | null;
  updated_at: string;
};

/** `null` means the read failed, so the screen can say so. */
export async function getRegisteredSlots(): Promise<Map<
  string,
  RegisteredSlot
> | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("image_slots")
      .select("slot_key, bucket, storage_path, alt, updated_at");

    if (error) {
      console.error("[ADMIN_SLOTS]", error.code, error.message);
      return null;
    }

    const map = new Map<string, RegisteredSlot>();
    for (const row of (data ?? []) as SlotRow[]) {
      const { data: publicUrl } = supabase.storage
        .from(row.bucket)
        .getPublicUrl(row.storage_path);
      map.set(row.slot_key, {
        key: row.slot_key,
        bucket: row.bucket,
        storagePath: row.storage_path,
        url: publicUrl.publicUrl,
        alt: row.alt,
        updatedAt: row.updated_at,
      });
    }
    return map;
  } catch (error) {
    console.error("[ADMIN_SLOTS]", error);
    return null;
  }
}

export type SlotWriteFailure = "not-an-image" | "upload-failed" | "register-failed";

export type SlotWriteResult =
  | { status: "success"; url: string }
  | { status: "error"; reason: SlotWriteFailure };

/**
 * Resize -> upload -> register, in that order.
 *
 * The order matters. The row is only repointed after the new object is
 * actually in the bucket, so a failed upload leaves the storefront showing the
 * previous image rather than a broken one. The old object is removed last and
 * best-effort: an orphaned file costs pennies, but deleting it before the row
 * moves would blank the live site if the update then failed.
 */
export async function replaceSlotImage(
  slot: SlotDefinition,
  version: string,
  input: ArrayBuffer,
  alt: string | null,
): Promise<SlotWriteResult> {
  let body: Buffer;
  try {
    body = await sharp(Buffer.from(input))
      .resize(dials.slotImageMaxDimensionPx, dials.slotImageMaxDimensionPx, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: dials.slotImageWebpQuality })
      .toBuffer();
  } catch (error) {
    // sharp throws on anything it cannot decode, which is the real check that
    // the upload is an image -- a MIME type is whatever the client claimed.
    console.error("[ADMIN_SLOT_RESIZE]", error);
    return { status: "error", reason: "not-an-image" };
  }

  const supabase = createAdminClient();
  const storagePath = slotStoragePath(slot, version);

  try {
    const { error } = await supabase.storage
      .from(slot.bucket)
      .upload(storagePath, body, { contentType: "image/webp", upsert: true });

    if (error) {
      console.error("[ADMIN_SLOT_UPLOAD]", error.message);
      return { status: "error", reason: "upload-failed" };
    }
  } catch (error) {
    console.error("[ADMIN_SLOT_UPLOAD]", error);
    return { status: "error", reason: "upload-failed" };
  }

  const previous = await getSlotRow(slot.key);

  try {
    const { error } = await supabase.from("image_slots").upsert(
      {
        slot_key: slot.key,
        bucket: slot.bucket,
        storage_path: storagePath,
        // A blank alt field clears the old text rather than silently keeping a
        // caption that described a different picture.
        alt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slot_key" },
    );

    if (error) {
      console.error("[ADMIN_SLOT_REGISTER]", error.code, error.message);
      return { status: "error", reason: "register-failed" };
    }
  } catch (error) {
    console.error("[ADMIN_SLOT_REGISTER]", error);
    return { status: "error", reason: "register-failed" };
  }

  await removeSuperseded(previous, slot.bucket, storagePath);

  const { data: publicUrl } = supabase.storage
    .from(slot.bucket)
    .getPublicUrl(storagePath);
  return { status: "success", url: publicUrl.publicUrl };
}

async function getSlotRow(
  key: string,
): Promise<{ bucket: string; storagePath: string } | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("image_slots")
      .select("bucket, storage_path")
      .eq("slot_key", key)
      .maybeSingle();

    if (error || !data) return null;
    return { bucket: data.bucket as string, storagePath: data.storage_path as string };
  } catch {
    return null;
  }
}

/**
 * Best-effort cleanup of the image this upload replaced. Never throws: the
 * swap has already succeeded by the time this runs, and a failed delete must
 * not report the founder's successful upload as an error.
 */
async function removeSuperseded(
  previous: { bucket: string; storagePath: string } | null,
  bucket: string,
  storagePath: string,
): Promise<void> {
  if (!previous) return;
  // The seed writes an unversioned path, so a first swap legitimately differs;
  // guard only against deleting what was just uploaded.
  if (previous.bucket === bucket && previous.storagePath === storagePath) return;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from(previous.bucket)
      .remove([previous.storagePath]);
    if (error) console.error("[ADMIN_SLOT_CLEANUP]", error.message);
  } catch (error) {
    console.error("[ADMIN_SLOT_CLEANUP]", error);
  }
}
