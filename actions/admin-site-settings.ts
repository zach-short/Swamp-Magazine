"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveAdminAccess } from "@/features/admin/lib/admin-guard";
import { adminRoutes } from "@/features/admin/lib/admin-routes";
import {
  writeDropAt,
  writeSiteMode,
} from "@/features/admin/lib/site-settings";
import type { SiteMode } from "@/lib/site-mode";

export type AdminSettingsFailure =
  | "not-authorized"
  | "invalid-input"
  | "server-error";

export type AdminSettingsResult =
  | { status: "success" }
  | { status: "error"; reason: AdminSettingsFailure };

/**
 * Closing the site can disarm a spent countdown as a side effect, so this one
 * carries what happened. The founder is told, rather than left to notice that
 * his drop time went blank.
 */
export type SetSiteModeResult =
  | { status: "success"; disarmedDropAt: boolean }
  | { status: "error"; reason: AdminSettingsFailure };

const modeSchema = z.enum(["coming_soon", "live"]);
const dropAtSchema = z.iso.datetime({ offset: true }).nullable();

export async function setSiteMode(mode: SiteMode): Promise<SetSiteModeResult> {
  const access = await resolveAdminAccess();
  if (access.status !== "ok") {
    return { status: "error", reason: "not-authorized" };
  }

  const parsed = modeSchema.safeParse(mode);
  if (!parsed.success) return { status: "error", reason: "invalid-input" };

  const write = await writeSiteMode(parsed.data);
  if (!write) return { status: "error", reason: "server-error" };

  revalidateAfterSettingsChange();
  return { status: "success", disarmedDropAt: write.disarmedDropAt };
}

export async function setDropAt(
  dropAt: string | null,
): Promise<AdminSettingsResult> {
  const access = await resolveAdminAccess();
  if (access.status !== "ok") {
    return { status: "error", reason: "not-authorized" };
  }

  const parsed = dropAtSchema.safeParse(dropAt);
  if (!parsed.success) return { status: "error", reason: "invalid-input" };

  if (!(await writeDropAt(parsed.data))) {
    return { status: "error", reason: "server-error" };
  }

  revalidateAfterSettingsChange();
  return { status: "success" };
}

/**
 * PLAN P4 watch-for: a mutation the public site does not reflect makes the
 * founder distrust the admin. Mode and drop_at gate the whole storefront
 * tree -- "/" chooses between coming-soon and live, and every /product page
 * redirects on the same read -- so the whole layout is swept rather than one
 * path. The admin's own view is refreshed too, or the toggle keeps showing the
 * value it just replaced.
 */
function revalidateAfterSettingsChange() {
  revalidatePath("/", "layout");
  revalidatePath(adminRoutes.dashboard);
}
