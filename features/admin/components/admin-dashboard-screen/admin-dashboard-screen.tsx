import Link from "next/link";

import { adminRoutes } from "../../lib/admin-routes";
import { getSiteSettings } from "../../lib/site-settings";
import { getSubscriberList } from "../../lib/subscribers";
import { SiteModeControls } from "../site-mode-controls/site-mode-controls";

export async function AdminDashboardScreen() {
  const [settings, subscribers] = await Promise.all([
    getSiteSettings(),
    getSubscriberList(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SiteModeControls
        mode={settings.mode}
        dropAt={settings.dropAt}
        dropAtFired={settings.dropAtFired}
      />

      <Link
        href={adminRoutes.subscribers}
        className="flex items-baseline justify-between gap-4 border-2 border-current p-4 transition-colors hover:bg-brand-red hover:text-cream sm:p-6"
      >
        <span className="font-display text-2xl leading-none">SUBSCRIBERS</span>
        <span className="font-display text-4xl leading-none">
          {subscribers.failed ? "—" : subscribers.total}
        </span>
      </Link>
    </div>
  );
}
