import Image from "next/image";

import { getCatalog, getLandingImagery } from "../../lib/catalog";
import { CatalogGrid } from "../catalog-grid/catalog-grid";
import { MarqueeTicker } from "../marquee-ticker/marquee-ticker";
import { Reveal } from "../reveal/reveal";

// The live landing per the founder's mock (Screenshot 2026-08-20 at 11.19.45
// AM): full-bleed film photo, the masthead spanning the full width at the top,
// mascot mid-page, byline bottom-center. The photo and the type ARE the
// design -- no chrome, no overlays.
export async function LiveLandingScreen() {
  const [products, imagery] = await Promise.all([
    getCatalog(),
    getLandingImagery(),
  ]);

  return (
    <main className="bg-cream">
      <section className="relative flex min-h-dvh flex-col justify-between overflow-hidden bg-ink">
        {/* The hero photo sits outside any Reveal so the LCP image is never
            held behind an entrance animation. Null hero -> solid ink ground,
            same composition. */}
        {imagery.hero && (
          <Image
            src={imagery.hero.url}
            alt={imagery.hero.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <Reveal className="relative">
          {/* Viewport-relative size so the masthead kisses both margins at
              every width, exactly like the mock's edge-to-edge lockup. */}
          <h1 className="whitespace-nowrap pt-[2.5vw] text-center font-display text-[14vw] leading-none tracking-[-0.015em] text-brand-red">
            SWAMP MAGAZINE
          </h1>
        </Reveal>
        {/* Goblin line-art arrives as a founder upload (landing_mascot, P4).
            Until then the center slot stays honestly empty -- never faked. */}
        {imagery.mascot && (
          <Reveal delay={0.1} className="relative self-center">
            <div className="relative aspect-square w-[34vw] max-w-60">
              <Image
                src={imagery.mascot.url}
                alt={imagery.mascot.alt}
                fill
                sizes="(min-width: 706px) 240px, 34vw"
                className="object-contain"
              />
            </div>
          </Reveal>
        )}
        <Reveal
          delay={0.15}
          className="relative pb-[max(2.5rem,env(safe-area-inset-bottom))]"
        >
          <p className="text-center font-body text-sm font-semibold tracking-[0.18em] text-brand-red sm:text-base">
            FROM LALO FARRO
          </p>
        </Reveal>
      </section>
      <MarqueeTicker line="SWAMP MAGAZINE * THE FIRST ISSUE * " />
      <CatalogGrid products={products} />
    </main>
  );
}
