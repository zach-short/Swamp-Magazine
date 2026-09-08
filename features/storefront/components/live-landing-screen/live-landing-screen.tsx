import Image from "next/image";

import { catalogNumber, getCatalog, getLandingImagery } from "../../lib/catalog";
import { storefrontCopy } from "../../lib/storefront-copy";
import { CatalogIndex } from "../catalog-index/catalog-index";
import { FilmBand } from "../film-band/film-band";
import { MarqueeTicker } from "../marquee-ticker/marquee-ticker";
import { Reveal } from "../reveal/reveal";
import { StarMark } from "../star-mark/star-mark";

// Direction A ("Feature Presentation"), picked by Zach 2026-09-08: the store as
// an A24 film page. Everything sits on ink, the masthead is restrained rather
// than edge-to-edge, and the photography plus the negative space around it
// carry the page. What this trades away, deliberately, is P2's 14vw red
// masthead and the Homer-style cutout grid -- both loud, both saying the same
// thing the hero already says.
export async function LiveLandingScreen() {
  const [products, imagery] = await Promise.all([
    getCatalog(),
    getLandingImagery(),
  ]);
  // Whichever product has a background first in catalog order -- never a
  // hardcoded slug, so a founder upload or a reorder moves the band with it.
  const bandIndex = products.findIndex((product) => product.background);

  return (
    <main className="bg-ink">
      <header className="flex h-16 items-center justify-between gap-4 bg-ink px-5 md:px-10">
        <span className="font-display text-[15px] tracking-[0.05em] text-brand-red md:text-[17px]">
          {storefrontCopy.wordmark}
        </span>
        <span className="font-body text-[10px] font-semibold tracking-[0.3em] text-cream/60 md:text-[11px]">
          {storefrontCopy.issue}
        </span>
      </header>

      {/* Minus the nav strip above it, so the first screen is the whole feature
          presentation -- masthead, byline and the dated caption at its foot --
          rather than a full viewport that pushes the caption below the fold. */}
      <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center overflow-hidden bg-ink">
        {/* Letterboxed, not full-bleed: solid ink bars top and bottom turn the
            photograph into a projected frame. The image sits outside any
            Reveal so the LCP is never held behind an entrance animation, and a
            null hero leaves the same composition on plain ink.

            The bars are a share of the hero, not a fixed 72px. The canvas sets
            them at 72 on an 880px artboard; pinning that pixel value against a
            viewport-driven hero made them read heavier on a short window and
            thinner on a tall one, which is the one place the built hero drifted
            from Direction A. 72/880 keeps the artboard's proportion at every
            height. */}
        {imagery.hero && (
          <div className="absolute inset-x-0 top-[calc(72/880*100%)] bottom-[calc(72/880*100%)]">
            <Image
              src={imagery.hero.url}
              alt={imagery.hero.alt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}
        <Reveal className="relative flex flex-col items-center gap-6 px-5 md:gap-7">
          <StarMark className="w-[38px] text-brand-red md:w-[46px]" />
          {/* Viewport-relative below sm so the lockup still fits a phone, then
              pinned at the canvas's 76px -- restrained is the point. */}
          <h1 className="whitespace-nowrap font-display text-[12vw] leading-none tracking-[0.04em] text-cream sm:text-[76px]">
            {storefrontCopy.wordmark}
          </h1>
          <p className="font-body text-[11px] font-semibold tracking-[0.4em] text-brand-red md:text-xs">
            {storefrontCopy.byline}
          </p>
          {/* Goblin line-art is a founder upload (landing_mascot, P4). Until it
              exists the slot stays honestly empty -- never faked. */}
          {imagery.mascot && (
            <div className="relative aspect-square w-[26vw] max-w-36">
              <Image
                src={imagery.mascot.url}
                alt={imagery.mascot.alt}
                fill
                sizes="(min-width: 706px) 144px, 26vw"
                className="object-contain"
              />
            </div>
          )}
        </Reveal>
        <p className="absolute inset-x-0 bottom-6 text-center font-body text-[10px] font-medium tracking-[0.3em] text-cream/55 md:text-[11px]">
          {storefrontCopy.issueDate}
        </p>
      </section>

      <CatalogIndex products={products} />

      {bandIndex === -1 ? null : (
        <FilmBand
          product={products[bandIndex]}
          number={catalogNumber(bandIndex)}
        />
      )}

      <footer className="border-t border-brand-red/35 bg-ink pt-6 pb-7 md:pt-[26px] md:pb-[30px]">
        <MarqueeTicker line={storefrontCopy.ticker} />
        <p className="mt-3.5 text-center font-body text-[10px] font-medium tracking-[0.35em] text-cream/45">
          {storefrontCopy.byline}
        </p>
      </footer>
    </main>
  );
}
