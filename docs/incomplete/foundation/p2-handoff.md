# P2 — Storefront: parallel-lane handoff

Written 2026-08-22 at P1 close (commit `cadf7d2`). The law is
`docs/incomplete/foundation/DESIGN.md` (D1–D4) and `PLAN.md` (P2 section, BD-1..6);
this file only adds the P2 spec detail and the division of labor. Copy is the
founder's — lift from mockups, flag anything invented.

## State you inherit (do not rebuild)

- P1 closed and cloud-verified: schema live on Supabase `rpiitnwalifrsuwreylw`,
  seed applied (4 products, 17 variants @ placeholder 12, WebPs in `products`/
  `slots` buckets), prod deploy at swamp-magazine.vercel.app (project
  `zachs-projects-b9823451/swamp-magazine`, GitHub push-to-deploy connected).
- **Shared P2 foundation is already built and gates-green** (typegen + tsc + lint):
  - `features/storefront/lib/catalog.ts` — data layer: `getCatalog()`,
    `getProduct(slug)`, `getLandingImagery()`; types `CatalogProduct`,
    `ProductDetail`, `ProductVariant`, `SlotImage`. Fail-soft, anon client, slot
    map with public URLs. **Interface is frozen for the lanes** — extend only in
    ways that don't break siblings, and say so in your report.
  - `features/storefront/components/marquee-ticker/marquee-ticker.tsx` — shared
    CSS marquee (Thames).
  - `features/storefront/components/reveal/reveal.tsx` — the one scroll-entrance
    primitive (Motion fade-and-rise, fires once in view). Use it; don't invent a
    second motion language.
  - `app/template.tsx` — route-change fade (Motion). Page transitions are DONE.
  - `app/product/[slug]/page.tsx` — route wired: mode gate (redirects to `/`
    unless live), fetch, 404, metadata. Renders `ProductScreen`.
  - Stubs that compile: `catalog-grid/catalog-grid.tsx` (Lane B replaces
    internals), `product-screen/product-screen.tsx` (Lane C replaces internals).
  - Barrel `features/storefront/index.ts` is final — all lane components are
    already exported. Don't edit it.
  - Tokens: `--brand-yellow` added to `app/globals.css` (BACK hover, from the
    Vamp Tee mock). `motion@13.1.1` installed.
  - `scripts/flip-mode.ts` — `bun run scripts/flip-mode.ts live|coming_soon`.

## Design spec (from the founder's mockups — Read these files, they are the spec)

Palette/type: vermillion `--brand-red` on film photo or `--cream`; display face
`font-display` (Anton, interim), body `font-body` (Archivo, interim). Fonts stay
as-is this phase — next/font already self-hosts them; the real faces are a
founder decision, still open. No raw hex in `.tsx` — tokens only.

1. **Landing (live mode)** — spec image
   `swamp-images/Screenshot 2026-08-20 at 11.19.45 AM.png`:
   full-bleed film photo (edge to edge, no chrome), giant red condensed
   "SWAMP MAGAZINE" spanning the full width at the top, goblin mascot line-art
   centered mid-page, small "FROM LALO FARRO" bottom-center. Hero image comes
   from `getLandingImagery()` (falls back to the Star Shorts lifestyle shot
   until the founder uploads `landing_hero` in P4; mascot slot renders nothing
   until a `landing_mascot` asset exists — do NOT fake the goblin).
2. **Catalog grid** — no founder mock; direction is Homer (product-forward,
   `inspiration-images/`): cutouts on flat cream, generous whitespace, name +
   price in red, whole cell links to `/product/[slug]`. 2-col mobile / 4-col
   desktop is the natural shape for 4 SKUs.
3. **Product page** — spec images
   `swamp-images/Screenshot 2026-08-21 at 11.31.00 AM.png` (Vamp Tee) and
   `…11.47.03 AM.png` (Star Shorts): full-bleed lifestyle photo; "BACK"
   top-left (red, `hover:text-brand-yellow` — the mock's yellow reads as the
   active state); model credits top-right (`product.modelCredits`, uppercase);
   floating product cutout dead center; product name small red beneath it; size
   row in large display type below that. Sold-out sizes: dimmed + line-through
   (`variant.soldOut`). The mock's right block (PLEASE VENMO / SUBMIT) is the
   ORDER FORM — that is **P3 Stripe scope, build nothing there**; show the
   price plainly instead. Background slot exists only for star-shorts today;
   other products fall back to `--ink` ground — founder uploads arrive in P4.
4. **Ticker** on the landing between hero and grid, line
   `"SWAMP MAGAZINE * THE FIRST ISSUE * "` (the coming-soon line minus
   "COMING SOON" — flag to founder as adapted copy).

## Lanes (run in parallel — file ownership is the collision boundary)

Rules for every lane: bun only; kebab-case files; named exports, function
declarations, no `React.FC`/`enum`/`any`; comments say *why*; images ONLY via
`next/image` (remotePatterns already allow `*.supabase.co`); touch ONLY the
files your lane owns; no commits (Zach's call); verify on the shared dev server
at `http://localhost:3000` (already running, hot-reloads — do NOT start a
second `next dev`, it fights over `.next/`). Kickoff (any lane, once):
`bun run scripts/flip-mode.ts live` — restore `coming_soon` only at Lane D's end.

### Lane A — Landing screen
Owns: `features/storefront/components/live-landing-screen/live-landing-screen.tsx`.
Replace the P1 placeholder with the real landing: hero section per spec §1
(min-h-dvh, `next/image` fill + priority, title overlay, FROM LALO FARRO,
mascot when the slot exists), then `<MarqueeTicker line="SWAMP MAGAZINE * THE FIRST ISSUE * " />`,
then `<CatalogGrid products={products} />` (data via `getCatalog()` +
`getLandingImagery()` from `../../lib/catalog`). Use `Reveal` for the title
entrance. The grid below may still be the stub — that's Lane B's file, leave it.

### Lane B — Catalog grid
Owns: `features/storefront/components/catalog-grid/catalog-grid.tsx`.
Replace the stub internals per spec §2. Cutout via `next/image` with honest
`sizes`; stagger cells with `Reveal` (`delay={index * 0.08}`); hover: subtle
scale on the image, CSS only. Cells are `next/link` to `/product/[slug]`.

### Lane C — Product screen
Owns: `features/storefront/components/product-screen/product-screen.tsx`.
Replace the stub internals per spec §3. Route, gating, metadata already exist —
component only. Test against `/product/vamp-tee` (5 sizes, bg fallback) AND
`/product/star-shorts` (3 sizes, real bg). For the sold-out visual, temporarily
zero one variant's `inventory_count` in the DB (service key) and RESTORE it to
12 after screenshotting — say so in your report.

### Lane D — Verification & close-out (starts after A–C report)
1. Gates: `bun run lint && bunx tsc --noEmit && bun run build && bun run test`
   (only this lane runs `build` — it fights the dev server's `.next/`; stop the
   dev server first, restart it after).
2. Browser proofs on the dev server: desktop (1280) + mobile (375) screenshots
   of landing, grid, `/product/star-shorts`, `/product/vamp-tee`; sold-out
   state visible on one size (zero + restore, as Lane C did); confirm every
   `<img>` in the DOM resolves through `/_next/image` (no raw
   `supabase.co/storage` URLs); confirm `/product/*` redirects to `/` in
   coming_soon mode; LCP sanity per PLAN's watch-for (hero must be the seeded
   WebP, never a 3–5 MB PNG).
3. Ship screenshots to Zach in chat (not into git).
4. Close per §6: PLAN.md P2 header (BUILT date/commit + deviations: interim
   fonts stand, ticker copy adapted, mascot + landing_hero + product bgs await
   founder uploads, order block deferred to P3), DESIGN.md `As built:` if any
   design-level fact changed, pass-off prompt for P3. Restore
   `coming_soon`, leave the subscriber flow untouched. Commits remain Zach's
   call — ask, don't assume.

## Open items for Zach (not blockers)

- Real font pick with the founder (current: Anton/Archivo interim).
- Goblin mascot as a standalone asset (SVG/PNG) → `landing_mascot` slot.
- Clean lifestyle shots for vamp-tee / college-arch / lurker-tee product bgs
  and a dedicated `landing_hero` (P4 admin uploads).
- Resend: delivered-email proof still wants a signup with the account-owner
  address (`zach.short@fantomworks.com`) at `localhost:3000`, or waits for P5
  domain verification.
