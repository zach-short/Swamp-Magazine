import { ComingSoonScreen } from "@/features/coming-soon";
import { LiveLandingScreen } from "@/features/storefront";
import { getSiteMode } from "@/lib/site-mode.server";

// The mode gate reads site_settings on every request so a flip in the admin
// (or Studio) changes "/" without a redeploy. /admin sits outside this gate.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const mode = await getSiteMode();
  return mode === "live" ? <LiveLandingScreen /> : <ComingSoonScreen />;
}
