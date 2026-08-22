import Image from "next/image";
import Link from "next/link";

import type { CatalogProduct } from "../../lib/catalog";
import { Reveal } from "../reveal/reveal";

// Homer register: the object floats alone in cream and the whitespace does the
// selling -- no cards, no borders, just tiny bold-tracked labels beneath. The
// centered name-under-cutout echoes the founder's own product mock, so the
// grid and the product page speak one language.
export function CatalogGrid({ products }: { products: CatalogProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="bg-cream px-5 py-20 md:px-10 md:py-28">
      <ul className="mx-auto grid max-w-[1600px] grid-cols-2 gap-x-4 gap-y-16 md:grid-cols-4 md:gap-x-10">
        {products.map((product, index) => (
          <li key={product.slug}>
            <Reveal delay={index * 0.08}>
              <Link
                href={`/product/${product.slug}`}
                className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
              >
                {/* The tall 4/5 box holds the row's rhythm even when a cutout
                    is missing -- the object hangs inset so it never touches
                    the edges of its cell. */}
                <div className="relative aspect-4/5">
                  {product.cutout ? (
                    // The seeded cutouts are cropped to the garment's last
                    // opaque pixel, so every bit of float comes from this
                    // inset -- 12% keeps the object clear of its cell.
                    <div className="absolute inset-[12%]">
                      <Image
                        src={product.cutout.url}
                        alt={product.cutout.alt}
                        fill
                        sizes="(min-width: 768px) 25vw, 50vw"
                        className="object-contain transition-transform duration-[350ms] ease-out group-hover:scale-103 motion-reduce:transition-none"
                      />
                    </div>
                  ) : null}
                </div>
                <p className="mt-5 text-center font-body text-[11px] font-semibold tracking-[0.15em] uppercase text-brand-red md:mt-6 md:text-xs">
                  {product.name}
                </p>
                <p className="mt-1 text-center font-body text-[11px] tracking-[0.15em] uppercase text-brand-red md:mt-1.5 md:text-xs">
                  ${Math.round(product.priceCents / 100)}
                </p>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
