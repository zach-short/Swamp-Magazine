import Link from "next/link";

import { formatUsd } from "@/lib/money";

import { catalogNumber, type CatalogProduct } from "../../lib/catalog";
import { storefrontCopy } from "../../lib/storefront-copy";
import { Reveal } from "../reveal/reveal";

// Direction A's catalog: a film-credits index, not a product grid. One row per
// product -- № / NAME / SIZES / PRICE on a hairline rule -- because the
// photography already sells in the hero and the film band, and a second grid of
// floating cutouts under them would say the same thing twice. The whole row is
// the link, so the target is the width of the page rather than a thumbnail.
export function CatalogIndex({ products }: { products: CatalogProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="bg-ink px-5 pt-16 pb-14 md:px-[120px] md:pt-[88px] md:pb-[72px]">
      <div className="mb-8 flex items-center gap-[18px] md:mb-[34px]">
        <span className="font-body text-[11px] font-semibold tracking-[0.35em] text-brand-red">
          {storefrontCopy.issue}
        </span>
        {/* Rule, not content: the row rules below repeat it down the page. */}
        <span aria-hidden className="h-px grow bg-brand-red/40" />
      </div>
      <ul>
        {products.map((product, index) => (
          <li
            key={product.slug}
            className="border-t border-brand-red/35 last:border-b"
          >
            <Reveal delay={index * 0.06}>
              <Link
                href={`/product/${product.slug}`}
                // Two columns on a phone (№ NAME PRICE, sizes beneath), the
                // canvas's four side by side from md up.
                className="group grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-2 py-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-red md:grid-cols-[90px_minmax(0,1fr)_220px_120px] md:gap-x-0 md:py-[30px]"
              >
                <span className="col-start-1 row-start-1 font-display text-[15px] text-brand-red">
                  {catalogNumber(index)}
                </span>
                <span className="col-start-2 row-start-1 font-display text-[30px] leading-none tracking-[0.02em] text-cream uppercase transition-colors duration-200 group-hover:text-brand-yellow md:text-[46px]">
                  {product.name}
                </span>
                <span className="col-start-2 row-start-2 font-body text-[11px] tracking-[0.25em] text-cream/55 md:col-start-3 md:row-start-1 md:text-xs">
                  {product.variants.map((variant) => variant.size).join(" ")}
                </span>
                <span className="col-start-3 row-start-1 text-right font-display text-[22px] text-brand-red md:col-start-4 md:text-[26px]">
                  {formatUsd(product.priceCents)}
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
