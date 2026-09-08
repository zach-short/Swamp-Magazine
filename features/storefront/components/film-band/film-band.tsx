import Image from "next/image";

import { formatUsd } from "@/lib/money";

import type { CatalogProduct } from "../../lib/catalog";

export type FilmBandProps = {
  product: CatalogProduct;
  /** The product's number in the catalog index, so the caption cross-references
   * the row a reader just scrolled past rather than inventing a second order. */
  number: string;
};

// One full-bleed frame from the shoot with a credits strip under it -- the
// still that runs beside a film's cast list. The caption is deliberately
// smaller than everything around it: the photograph is the statement.
export function FilmBand({ product, number }: FilmBandProps) {
  if (!product.background) return null;

  return (
    <section className="bg-ink">
      <div className="relative h-[320px] overflow-hidden md:h-[520px]">
        <Image
          src={product.background.url}
          alt={product.background.alt}
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div className="flex items-baseline justify-between gap-4 px-5 pt-3 pb-4 md:px-[120px] md:pt-[14px] md:pb-[18px]">
        <p className="font-body text-[10px] font-medium tracking-[0.3em] text-cream/50 uppercase">
          {[number, product.name, product.modelCredits]
            .filter(Boolean)
            .join(" — ")}
        </p>
        <p className="font-body text-[10px] font-medium tracking-[0.3em] text-brand-red">
          {formatUsd(product.priceCents)}
        </p>
      </div>
    </section>
  );
}
