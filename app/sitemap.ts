import type { MetadataRoute } from "next";

import { dials } from "@/config/dials";
import { getCatalog } from "@/features/storefront";
import { getSiteMode } from "@/lib/site-mode.server";

// Reads site_settings and the catalog per request, like the mode gate: the
// founder adds a product or flips the drop from his phone, and the sitemap is
// right on the next crawl instead of the next deploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = {
    url: absolute("/"),
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 1,
  };

  const mode = await getSiteMode();
  // Before the drop every /product/* URL redirects to "/", so listing them
  // would just hand crawlers a pile of 307s and leak the lineup early.
  if (mode !== "live") return [home];

  const products = await getCatalog();
  return [
    home,
    ...products.map((product) => ({
      url: absolute(`/product/${product.slug}`),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}

function absolute(path: string): string {
  return new URL(path, dials.canonicalSiteUrl).toString();
}
