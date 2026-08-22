import "server-only";

import { resolveSiteMode, type SiteMode } from "@/lib/site-mode";
import { createAdminClient } from "@/lib/supabase/admin";

import { hasDropAtFired } from "./drop-at";

export type SiteSettings = {
  mode: SiteMode;
  dropAt: string | null;
  /**
   * True when `dropAt` has already passed, i.e. the countdown fired and is now
   * the only thing holding the store open. Resolved on the server so the admin
   * and the storefront answer to one `now`, and so the client never renders a
   * time-dependent value the server did not agree to.
   */
  dropAtFired: boolean;
};

const SETTINGS_ID = 1;

/**
 * Reads the singleton settings row through the service role. The storefront
 * reads the same row anonymously, but the admin must see the stored truth even
 * if the public read policy is ever narrowed.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("mode, drop_at")
      .eq("id", SETTINGS_ID)
      .maybeSingle();

    if (error) {
      console.error("[ADMIN_SETTINGS]", error.code, error.message);
    }

    const dropAt = typeof data?.drop_at === "string" ? data.drop_at : null;

    return {
      // The effective mode, not the stored column. Once drop_at fires the
      // public site is live while the row still reads coming_soon, and an admin
      // reporting the column would sit there offering "GO LIVE" over an open
      // store -- with no button anywhere to close it again.
      mode: resolveSiteMode(data?.mode, dropAt),
      dropAt,
      dropAtFired: hasDropAtFired(dropAt),
    };
  } catch (error) {
    console.error("[ADMIN_SETTINGS]", error);
    return { mode: "coming_soon", dropAt: null, dropAtFired: false };
  }
}

/** Outcome of a mode write, so the admin can report what else it touched. */
export type SiteModeWrite = { disarmedDropAt: boolean };

/**
 * Writes `site_settings.mode`, disarming a spent countdown on the way down.
 * Callers own revalidation. `null` means the write did not land.
 *
 * Closing the site has to clear a `drop_at` that already fired, in the same
 * update: `resolveSiteMode` lets a fired timestamp override a stored
 * `coming_soon` -- it must, since that is the exact state an armed countdown
 * sits in -- so a mode-only write is read straight back as `live` on the next
 * request and the founder's toggle looks broken.
 *
 * A countdown still in the future is left alone. It is not holding the site
 * open, and closing the shop until Friday's drop is a real thing to want; a
 * blanket clear would quietly cancel Friday.
 */
export async function writeSiteMode(
  mode: SiteMode,
): Promise<SiteModeWrite | null> {
  const disarmDropAt =
    mode === "coming_soon" && (await isDropAtHoldingSiteOpen());

  // Annotated so the two branches agree on one patch shape rather than
  // inferring `drop_at?: undefined` on the way past.
  const patch: Record<string, string | null> = disarmDropAt
    ? { mode, drop_at: null }
    : { mode };

  return (await writeSettings(patch)) ? { disarmedDropAt: disarmDropAt } : null;
}

/** Writes `site_settings.drop_at`; `null` disarms the countdown. */
export async function writeDropAt(dropAt: string | null): Promise<boolean> {
  return writeSettings({ drop_at: dropAt });
}

/**
 * Re-reads `drop_at` at write time rather than trusting the value the admin
 * page rendered with, which may have been fetched before the drop fired.
 *
 * A failed read answers "yes". The one job of this toggle is that the shop
 * actually closes, so a timestamp we cannot see gets cleared rather than left
 * holding the door open.
 */
async function isDropAtHoldingSiteOpen(): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("drop_at")
      .eq("id", SETTINGS_ID)
      .maybeSingle();

    if (error) {
      console.error("[ADMIN_SETTINGS]", error.code, error.message);
      return true;
    }
    return hasDropAtFired(data?.drop_at);
  } catch (error) {
    console.error("[ADMIN_SETTINGS]", error);
    return true;
  }
}

async function writeSettings(
  patch: Record<string, string | null>,
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("site_settings")
      .update(patch)
      .eq("id", SETTINGS_ID);

    if (error) {
      console.error("[ADMIN_SETTINGS_WRITE]", error.code, error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[ADMIN_SETTINGS_WRITE]", error);
    return false;
  }
}
