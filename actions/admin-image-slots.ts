"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dials } from "@/config/dials";
import { resolveAdminAccess } from "@/features/admin/lib/admin-guard";
import { adminRoutes } from "@/features/admin/lib/admin-routes";
import {
  clearSlotImage as clearRegisteredSlot,
  replaceSlotImage,
} from "@/features/admin/lib/image-slots";
import { getProductIndex } from "@/features/admin/lib/products";
import {
  allSlotDefinitions,
  findSlotDefinition,
} from "@/features/admin/lib/slot-keys";

export type SlotUploadFailure =
  | "not-authorized"
  | "invalid-input"
  | "unknown-slot"
  | "no-file"
  | "too-large"
  | "not-an-image"
  | "server-error";

export type SlotUploadResult =
  | { status: "success"; url: string }
  | { status: "error"; reason: SlotUploadFailure };

const altSchema = z.string().trim().max(300);

/**
 * Swaps the image behind one slot.
 *
 * FormData rather than a typed argument because this carries a file. The slot
 * key is checked against the closed list built from the live product table --
 * not merely parsed -- so this cannot be driven into writing a key the
 * storefront never reads, or a storage path outside the two buckets.
 */
export async function uploadSlotImage(
  formData: FormData,
): Promise<SlotUploadResult> {
  const access = await resolveAdminAccess();
  if (access.status !== "ok") {
    return { status: "error", reason: "not-authorized" };
  }

  const rawKey = formData.get("slotKey");
  const parsedAlt = altSchema.safeParse(formData.get("alt") ?? "");
  if (typeof rawKey !== "string" || !parsedAlt.success) {
    return { status: "error", reason: "invalid-input" };
  }

  const products = await getProductIndex();
  if (!products) return { status: "error", reason: "server-error" };

  const slot = findSlotDefinition(allSlotDefinitions(products), rawKey);
  if (!slot) return { status: "error", reason: "unknown-slot" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", reason: "no-file" };
  }
  if (file.size > dials.slotImageMaxUploadBytes) {
    return { status: "error", reason: "too-large" };
  }

  const result = await replaceSlotImage(
    slot,
    // Short random token, not a timestamp: two uploads inside the same second
    // would otherwise collide on one path and the second would win silently.
    randomUUID().slice(0, 8),
    await file.arrayBuffer(),
    parsedAlt.data.length > 0 ? parsedAlt.data : null,
  );

  if (result.status === "error") {
    return {
      status: "error",
      reason: result.reason === "not-an-image" ? "not-an-image" : "server-error",
    };
  }

  revalidateImagery(slot.key);
  return { status: "success", url: result.url };
}

export type SlotClearFailure =
  | "not-authorized"
  | "invalid-input"
  | "unknown-slot"
  | "not-set"
  | "server-error";

export type SlotClearResult =
  | { status: "success" }
  | { status: "error"; reason: SlotClearFailure };

/**
 * Takes one slot back off the site.
 *
 * The slot key is checked against the same closed list the upload uses, for
 * the same reason: an unchecked key here would delete rows the admin never
 * offered. A plain argument rather than FormData -- there is no file to carry
 * -- but it still crosses the network, so the type is a claim to verify, not a
 * fact.
 */
export async function clearSlotImage(
  slotKey: string,
): Promise<SlotClearResult> {
  const access = await resolveAdminAccess();
  if (access.status !== "ok") {
    return { status: "error", reason: "not-authorized" };
  }

  if (typeof slotKey !== "string") {
    return { status: "error", reason: "invalid-input" };
  }

  const products = await getProductIndex();
  if (!products) return { status: "error", reason: "server-error" };

  const slot = findSlotDefinition(allSlotDefinitions(products), slotKey);
  if (!slot) return { status: "error", reason: "unknown-slot" };

  const result = await clearRegisteredSlot(slot);
  if (result.status === "error") {
    return {
      status: "error",
      reason: result.reason === "not-registered" ? "not-set" : "server-error",
    };
  }

  revalidateImagery(slot.key);
  return { status: "success" };
}

/**
 * PLAN P4 watch-for again, and the loudest case of it: swapping the hero is
 * the walkthrough proof, so if "/" does not change the founder concludes the
 * admin does nothing. Product slot keys carry their slug, so the matching
 * product page is swept too.
 */
function revalidateImagery(slotKey: string): void {
  revalidatePath("/");
  const [, slug] = slotKey.split(":");
  if (slug) revalidatePath(`/product/${slug}`);
  revalidatePath(adminRoutes.slots);
}
