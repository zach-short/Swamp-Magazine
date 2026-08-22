"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminRoutes } from "../../lib/admin-routes";

// Every section is built as of P4's close. `ready` survives the handoff it was
// written for: the next section to be sketched ahead of its screen gets a
// `false` here and shows as SOON rather than 404-ing an unlabelled link.
const NAV_ITEMS = [
  { href: adminRoutes.dashboard, label: "SITE", ready: true, exact: true },
  { href: adminRoutes.subscribers, label: "SUBSCRIBERS", ready: true, exact: false },
  { href: adminRoutes.products, label: "PRODUCTS", ready: true, exact: false },
  { href: adminRoutes.slots, label: "IMAGES", ready: true, exact: false },
  { href: adminRoutes.orders, label: "ORDERS", ready: true, exact: false },
] as const;

const itemClasses =
  "shrink-0 border-2 border-current px-3 py-2 font-display text-base leading-none tracking-wide transition-colors";

export function AdminNav() {
  const pathname = usePathname();

  return (
    // Horizontal scroll instead of a wrap: on a phone the nav stays one line
    // and the content starts above the fold.
    <nav
      aria-label="Admin sections"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        if (!item.ready) {
          // A plain anchor, not next/link: prefetching a route that does not
          // exist yet only buys a 404 in the network tab.
          return (
            <a
              key={item.href}
              href={item.href}
              className={`${itemClasses} opacity-40`}
            >
              {item.label}
              <span className="ml-2 font-body text-[10px] tracking-widest">
                SOON
              </span>
            </a>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${itemClasses} ${
              active
                ? "bg-brand-red text-cream"
                : "hover:bg-brand-red hover:text-cream"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
