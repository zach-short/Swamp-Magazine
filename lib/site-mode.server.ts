import { createClient } from "@/lib/supabase/server";
import { resolveSiteMode, type SiteMode } from "@/lib/site-mode";

// The layout-level gate reads this per request (callers are force-dynamic), so
// flipping site_settings.mode in the admin or Studio changes "/" immediately.
export async function getSiteMode(): Promise<SiteMode> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("mode")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      // Log fields explicitly: PostgrestError serializes to {} in the dev
      // overlay's console forwarding.
      console.error("[SITE_MODE]", error.code, error.message);
    }
    return resolveSiteMode(data?.mode);
  } catch (error) {
    console.error("[SITE_MODE]", error);
    return "coming_soon";
  }
}
