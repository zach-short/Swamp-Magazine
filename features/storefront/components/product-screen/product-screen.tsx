import Image from "next/image";
import Link from "next/link";

import { CheckoutForm } from "@/features/checkout";

import { Reveal } from "../reveal/reveal";
import type { ProductDetail } from "../../lib/catalog";

// Order page per the founder's mockups: full-bleed lifestyle photo, small red
// stations at the edges, product cutout floating dead center with the name
// small and the size row huge beneath it. The mock's NAME/PHONE/VENMO blocks
// are the order form, which now really is one (P3): CheckoutForm owns the size
// row, so the display-only list and the standalone price station both came out
// rather than sitting alongside it quoting a second, dumber price.
export function ProductScreen({ product }: { product: ProductDetail }) {
  return (
    <main className="relative flex min-h-dvh flex-col bg-ink font-display uppercase text-brand-red">
      {product.background ? (
        <Image
          src={product.background.url}
          alt={product.background.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : null}

      <header className="relative z-10 flex items-start justify-between gap-6 p-5 sm:p-8">
        <Link
          href="/"
          className="text-lg transition-colors duration-200 hover:text-brand-yellow focus-visible:text-brand-yellow focus-visible:outline-none sm:text-2xl"
        >
          BACK
        </Link>
        {product.modelCredits ? (
          <p className="max-w-[60%] text-right text-lg sm:text-2xl">
            {product.modelCredits}
          </p>
        ) : null}
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center pb-16 sm:pb-8">
        <Reveal className="flex flex-col items-center gap-4 px-5 sm:gap-5">
          {product.cutout ? (
            <div className="relative aspect-square w-[min(72vw,42dvh)] sm:w-[min(30vw,50dvh)]">
              <Image
                src={product.cutout.url}
                alt={product.cutout.alt}
                fill
                // Always above the fold, so never lazy; the preload hint goes
                // to the background when it exists (it is the LCP), otherwise
                // the cutout is the largest paint and takes it.
                priority={!product.background}
                loading="eager"
                sizes="(min-width: 640px) 30vw, 72vw"
                className="object-contain"
              />
            </div>
          ) : null}
          <h1 className="text-base sm:text-xl">{product.name}</h1>
          {/* Bounded so the ledger and delivery rows stay a block under the
              cutout instead of stretching the width of the photo. */}
          <div className="w-full max-w-sm">
            <CheckoutForm
              slug={product.slug}
              name={product.name}
              priceCents={product.priceCents}
              variants={product.variants}
            />
          </div>
        </Reveal>
      </div>
    </main>
  );
}
