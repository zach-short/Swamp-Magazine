import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { parseDropAt, resolveSiteMode, type SiteMode } from "@/lib/site-mode";

export type SiteSettings = {
  mode: SiteMode;
  /** Armed drop timestamp, or null when no countdown is running. */
  dropAt: Date | null;
};

type SiteSettingsRow = { mode?: unknown; drop_at?: unknown } | null;

// The layout-level gate reads this per request (callers are force-dynamic), so
// flipping site_settings.mode in the admin or Studio changes "/" immediately.
// Memoised per request because two consumers want the same row on one render:
// the mode gate in "/" and the countdown on the coming-soon screen.
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("mode, drop_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      // Log fields explicitly: PostgrestError serializes to {} in the dev
      // overlay's console forwarding.
      console.error("[SITE_MODE]", error.code, error.message);
    }

    const row = data as SiteSettingsRow;
    return {
      mode: resolveSiteMode(row?.mode, row?.drop_at),
      dropAt: parseDropAt(row?.drop_at),
    };
  } catch (error) {
    console.error("[SITE_MODE]", error);
    return { mode: "coming_soon", dropAt: null };
  }
});

export async function getSiteMode(): Promise<SiteMode> {
  const { mode } = await getSiteSettings();
  return mode;
}
