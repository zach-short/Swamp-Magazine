# Hand-off: implement Direction A ("Feature Presentation") + ingest the SWAMP WITH ZACH photos

Written 2026-09-08 by a prior session that drafted three A24-style storefront
directions on a design canvas. Zach picked **Direction A**. This doc is the
complete brief for a fresh session: no other conversation context is needed.
Read `CLAUDE.md`, `docs/incomplete/foundation/DESIGN.md`, and
`docs/incomplete/foundation/PLAN.md` before writing code — the process docs are
the law, and the session protocol lives in PLAN.md.

Reference canvas (three directions, A is the leftmost/Main artboard):
https://claude.ai/code/artifact/b86aa346-94c0-4157-b188-05b2aa844026
The canvas is exploration, not spec-perfect: its photos are AI stand-ins that
must NOT ship. Production imagery is the founder's/Zach's real photography
(Task 1). Pixel values below are the spec; the canvas is for overall feel.

---

## Task 1 — Convert the SWAMP WITH ZACH PDFs into project images

Source: `/Users/zachshort/Downloads/SWAMP WITH ZACH/` — five PDFs, each a
**single-page PDF wrapping one high-res product-background photo** (metadata
tools may claim hundreds of pages; `mdls -name kMDItemNumberOfPages` says 1,
and that is correct). `sips` converts them natively — poppler is NOT installed
and is not needed:

```bash
sips -s format png "IN.pdf" --out "OUT.png"
```

Convert, verify each PNG visually (Read the file — confirm a full un-cropped
photo at high resolution; if an output ever looks partial, `brew install
poppler` and use `pdftoppm -r 300` instead), then move the PNGs into
`swamp-images/` (gitignored masters directory — they must NOT be committed;
confirm `git status` stays clean afterwards):

| PDF | Master name in swamp-images/ | Product slug |
|---|---|---|
| COLLEGE ARCH ZACH.pdf | `COLLEGE ARCH BG - ZACH.png` | `college-arch` |
| LURKER ZACH.pdf | `LURKER BG - ZACH.png` | `lurker-tee` |
| LURKER LONGSLEEVE ZACH.pdf | `LURKER LONGSLEEVE BG - ZACH.png` | none yet — see below |
| STAR SHORTS ZACH.pdf | `STAR SHORTS BG - ZACH.png` | `star-shorts` |
| VAMP ZACH.pdf | `VAMP BG - ZACH.png` | `vamp-tee` |

Then extend `scripts/seed.ts` `LIFESTYLE_SLOTS` with `product_bg:<slug>`
entries for college-arch, lurker-tee, and vamp-tee (same shape as the existing
star-shorts entry: bucket `slots`, path `product_bg-<slug>.webp`, honest alt
text) and run `bun run seed` (needs `.env.local`; sharp resizes to ≤2000px
WebP q82).

Three cautions:

1. **Star Shorts already has a registered `product_bg`** pointing at the same
   storage path the seed would write. `registerSlot` uses `ignoreDuplicates`
   (row survives) but `uploadWebp` uses `upsert: true` — re-uploading to the
   same path **silently replaces the live image**. Decide deliberately: if
   Zach's new shot should replace `SHORTS GRID BACKGROUND SS.png`, let it
   upload; if not, leave star-shorts out of the seed change. Ask Zach if
   ambiguous; note P4's admin uploader deliberately versions files instead of
   overwriting, so the founder's admin path is the safer swap mechanism.
2. **LURKER LONGSLEEVE is a product that does not exist in the catalog** (DB
   has vamp-tee / star-shorts / college-arch / lurker-tee). Do NOT invent a
   price or sizes. Convert and stage the master, and flag the new product to
   Zach — adding it needs founder facts (price, sizes, credits).
3. These photos contain the models' faces — alt text should stay in the
   existing register ("<Name> lifestyle shot"), and model credits come from
   the DB (`products.model_credits`), which is the source of truth (e.g.
   "KIRBY-ANA (BEHIND)", "ANANYA (L), JESSICA (R)" — slightly different from
   any mockup shorthand).

## Task 2 — Implement Direction A on the live storefront

Direction A = "the store as an A24 film page": everything on ink, restrained
masthead, photography and negative space carry the page, catalog as a
film-credits index. It touches the **live** storefront only:
`features/storefront` (`LiveLandingScreen`, `CatalogGrid`, `ProductScreen`)
plus container styling around the checkout form. Coming-soon page, admin, and
the money path are OUT of scope.

Brand constants (already in `app/globals.css` — no new colors, no raw hex in
`.tsx`): `--brand-red #e0361f`, `--brand-yellow #f2e438`, `--cream #f4eddd`,
`--ink #16110d`; `--font-display` (Anton), `--font-body` (Archivo). Yellow is
the ratified active/selected state. Hairline rules on ink are brand-red at
~35% alpha — add a token/utility rather than inlining rgba in tsx if needed.

### Landing (`live-landing-screen.tsx`)

1. **Nav strip** (~64px, ink): left "SWAMP MAGAZINE" display-face ~17px red,
   right "THE FIRST ISSUE" body-face ~11px, letter-spacing ~0.3em, cream at
   ~60%.
2. **Hero**: full-viewport ink section, the `landing_hero` slot image
   letterboxed (solid-ink bars ~72px top and bottom, image `object-cover`
   between). Centered stack: star mark, then "SWAMP MAGAZINE" in the display
   face at a **restrained** ~76px cream (this replaces the current 14vw
   edge-to-edge red masthead — that loudness is what Direction A trades away),
   then "FROM LALO FARRO" ~12px red tracked ~0.4em. Bottom-center caption:
   "THE FIRST ISSUE — FALL 2025" ~11px cream ~55%.
   - Star mark: `public/brand/swamp-star.svg` is the path on a **red square**
     — for the hero you need the bare star path (red fill, transparent
     ground). Add a path-only variant or inline SVG; don't ship the square.
   - Keep the LCP discipline: hero image outside `Reveal`, `priority`, null
     hero → solid ink, same composition. `landing_mascot` slot may stay
     mid-hero if present (founder upload, P4).
3. **Catalog index** (replaces the Homer cutout grid on the landing): one row
   per product — grid `№ / NAME / sizes / price`, №s "01"–"04" display-face
   ~15px red, name display-face ~46px cream, sizes body-face ~12px tracked
   cream ~55%, price display-face ~26px red right-aligned, rows separated by
   1px red-35% rules, generous padding (~30px vertical). Whole row links to
   the product page. Data comes from `getCatalog()` (names, whole-dollar
   prices via the house formatter, sizes from variants, `sort_order` gives
   the numbering). The `CatalogGrid` component can be rebuilt in place or a
   new `catalog-index` component swapped in — either way exported through the
   feature barrel.
4. **Film band**: one full-bleed `product_bg` photo band (~520px,
   `object-cover`) with a caption strip beneath: left "№ — NAME — CREDITS"
   ~10px tracked cream 50%, right price ~10px red. Pick the band product by
   sort order or first product with a background — don't hardcode a slug.
5. **Footer**: 1px red-35% top rule, the existing marquee ticker line
   ("SWAMP MAGAZINE * THE FIRST ISSUE * ") in display face ~15px red, then
   "FROM LALO FARRO" centered ~10px cream 45%. Keep the CSS marquee and the
   `Reveal` primitive as the only motion (both respect
   `prefers-reduced-motion`); no new animation.

### Product page (`product-screen.tsx` + checkout containers)

Split layout on ink: **left ~60%** the `product_bg:<slug>` image full-bleed
(fall back to cutout, then solid ink); **right ~40%** an ink panel containing
the existing checkout flow restyled to this anatomy, top to bottom: product
name (display ~54px cream), price (display ~30px red), "SIZE" label (~10px
tracked, cream 50% — INVENTED word, keep it flagged) above the size row
(display ~26px: selected = yellow, unselected = cream ~45%, sold out keeps
the dim + line-through + `sr-only` "sold out"), delivery row ("PICKUP — FREE"
yellow when selected / "SHIP — $5" — the $5 comes from `config/dials.ts`,
never hardcode), NAME label (display, red) over a ruled blank, SUBMIT
(display ~30px red, no box), model credits line (~10px cream 40%) at the
bottom. "BACK" stays top-left over the photo, red, per the founder's mockups.

Money-path rules: do not touch `actions/`, the webhook, or checkout logic —
this is a re-skin of containers and typography only. Stripe Elements pull
their palette from `features/checkout/lib/stripe-appearance.ts`, which
resolves off `:root` at runtime — verify the Stripe inputs remain legible on
the ink panel (they were styled for red-on-photo; cream text on ink is the
target) and adjust the appearance mapping if needed, not the session logic.
Preserve every existing state: sold-out, un-keyed "ORDERS OPEN SOON" branch
(which must keep showing price + read-only size row), error lines from
`order-copy.ts`.

### Copy discipline

Founder's (lift verbatim): SWAMP MAGAZINE, FROM LALO FARRO, THE FIRST ISSUE,
product names/prices/sizes, BACK, NAME, SUBMIT, the ticker line, model
credits (from DB). Already-flagged INVENTED (keep, don't multiply): NEXT,
PICKUP/SHIP/FREE, TOTAL, PAY WITH, CARD, SIZE label. Newly promoted and
needing founder sign-off: "FALL 2025" as on-site copy (it appears on the
crewneck print in his photos). Do not invent anything else; anything new goes
into `order-copy.ts`-style flagged constants.

### Process + verification

- Record the redesign in `docs/incomplete/foundation/DESIGN.md` as a dated
  amendment/As-built note (never edit ratified text in place): Direction A
  picked by Zach 2026-09-08 from the canvas above; founder sign-off on the
  new look + flagged copy still pending.
- Conventions: bun/bunx only; kebab-case files; features through barrels;
  tokens only in `globals.css`; every tunable number in `config/dials.ts`;
  comments explain why. This Next.js version has breaking changes — read
  `node_modules/next/dist/docs/` before writing route/App code.
- Gates before closing: `bun run lint && bun run build && bunx tsc --noEmit
  && bun run test` — **build before tsc** (route types are generated during
  build).
- Visual verification: use the Browser pane dev server (`.claude/launch.json`
  / preview_start, never Bash). NOTE: the mode gate is global — the
  storefront only renders when the **production** `site_settings` row is
  `live` (`scripts/flip-mode.ts` flips it, and it is shared prod state — flip
  it back, and coordinate if any other session is working). Screenshot
  landing + product page as proof, including a mobile width (the index rows
  and split product layout must degrade to stacked layouts — the canvas only
  drew desktop; use judgment consistent with the existing mobile behavior).
- The three AI-generated stills in the canvas (swamp night, brick arch, etc.)
  are exploration stand-ins only — none of them ships.

### Parked decisions (surface to Zach, do not decide)

1. Replace the current Star Shorts background with Zach's new shot? (Task 1
   caution 1.)
2. Add LURKER LONGSLEEVE as a product (price/sizes/credits needed).
3. Founder sign-off: restrained cream masthead vs his red edge-to-edge mock;
   "FALL 2025"; the SIZE label; landing loses the cutout grid (cutouts remain
   on nothing right now — if he wants them somewhere, that's a follow-up).
