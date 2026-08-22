import { getProduct } from "@/features/storefront";
import { ogContentType, ogImageSize, renderOgCard } from "@/lib/og-card";
import { getSiteMode } from "@/lib/site-mode.server";

export const alt = "SWAMP MAGAZINE";
export const size = ogImageSize;
export const contentType = ogContentType;

// params is typed inline rather than through the generated route types, which
// only refresh on a build.
type ProductOgImageProps = { params: Promise<{ slug: string }> };

export default async function ProductOpengraphImage({
  params,
}: ProductOgImageProps) {
  const { slug } = await params;
  const mode = await getSiteMode();
  // The product page itself redirects to "/" before the drop; an unreleased
  // name and its cutout must not leak through a share card either.
  const product = mode === "live" ? await getProduct(slug) : null;

  return product
    ? renderOgCard({
        eyebrow: "SWAMP MAGAZINE",
        title: product.name,
        footnote: "THE FIRST ISSUE",
      })
    : renderOgCard({
        eyebrow: "FROM LALO FARRO",
        title: "SWAMP MAGAZINE",
        footnote: "COMING SOON",
      });
}
