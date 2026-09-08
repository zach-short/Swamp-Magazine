import Image from "next/image";
import Link from "next/link";

import { CheckoutForm } from "@/features/checkout";
import { formatUsd } from "@/lib/money";

import type { ProductDetail } from "../../lib/catalog";
import { storefrontCopy } from "../../lib/storefront-copy";
import { Reveal } from "../reveal/reveal";

// Direction A's product page: the shoot on the left, an ink panel on the right,
// nothing between them. The order block is the same CheckoutForm P3 shipped --
// only the container, the alignment and the palette moved. BACK stays top-left
// over the photograph, red, per the founder's own mockups.
export function ProductScreen({ product }: { product: ProductDetail }) {
  return (
    <main className="min-h-dvh bg-ink">
      <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[3fr_2fr]">
        <div className="relative min-h-[58dvh] overflow-hidden bg-ink md:min-h-dvh">
          {/* Background first, cutout second, solid ink last: the panel beside
              it holds the composition either way, so a missing image degrades
              to negative space rather than to a hole. */}
          {product.background ? (
            <Image
              src={product.background.url}
              alt={product.background.alt}
              fill
              priority
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover"
            />
          ) : product.cutout ? (
            <Image
              src={product.cutout.url}
              alt={product.cutout.alt}
              fill
              priority
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-contain p-10"
            />
          ) : null}
          <Link
            href="/"
            className="absolute top-5 left-5 font-display text-lg text-brand-red transition-colors duration-200 hover:text-brand-yellow focus-visible:text-brand-yellow focus-visible:outline-none md:top-8 md:left-8 md:text-xl"
          >
            {storefrontCopy.back}
          </Link>
        </div>

        <div className="flex flex-col justify-center px-6 py-12 md:px-16 md:py-[72px]">
          <Reveal className="flex flex-col gap-8 md:gap-[34px]">
            <div className="flex flex-col gap-4 md:gap-[34px]">
              <h1 className="font-display text-[38px] leading-none tracking-[0.02em] text-cream uppercase md:text-[54px]">
                {product.name}
              </h1>
              <p className="font-display text-2xl text-brand-red md:text-[30px]">
                {formatUsd(product.priceCents)}
              </p>
            </div>

            <CheckoutForm
              slug={product.slug}
              name={product.name}
              priceCents={product.priceCents}
              variants={product.variants}
            />

            {/* The founder's credit line, from the DB rather than from any
                mockup shorthand -- `products.model_credits` is the source. */}
            {product.modelCredits ? (
              <p className="font-body text-[10px] tracking-[0.3em] text-cream/40 uppercase">
                {product.modelCredits}
              </p>
            ) : null}
          </Reveal>
        </div>
      </div>
    </main>
  );
}
