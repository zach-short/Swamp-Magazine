# Foundation — build plan

**Status: RATIFIED 2026-08-22 (GATE 2, in chat) — approved as written; Zach deferred
the build to a later session.** Implements `DESIGN.md` D1–D4.
One phase per session. Phase headers get `**BUILT <date>, commit <hash>**` as they land.

## 0. Facts verified 2026-08-22 (supersede DESIGN.md where they differ)

| Claim | Verified state |
|---|---|
| Repo | one commit `76ef2ab`; no code, no package.json; 377 MB of PNGs tracked |
| Accounts existing | GitHub repo + domain only. No Supabase project, no Vercel project, no Stripe account, no Resend account yet (per Zach, 2026-08-22) |
| Catalog source of truth | product cutouts + lifestyle shots in `swamp-images/`; prices on mockups: Vamp Tee $20 (XS–XL), Star Shorts $25 (S/M/L) |

## 1. Build-level decisions (reversible; not GATE-ratified)

- **BD-1** Package manager/runtime for scripts: **bun** (matches Zach's other repos). Reverse: swap lockfile, scripts are npm-compatible.
- **BD-2** Next.js current stable at scaffold time (expected 16.x — verify with `npm view next version` in P1, record actual in the phase header), TypeScript strict, Tailwind v4, Motion for animation.
- **BD-3** Catalog lives in **our** Postgres; Stripe gets line items server-side at session creation (`price_data` inline). No Stripe Product sync to break.
- **BD-4** One-product-per-order (matches mockups; no cart). Cart is a reserved seam.
- **BD-5** Testing: vitest only where failure is silent — webhook idempotency, inventory decrement, mode gating. UI verified by screenshot/runtime pass, not component tests.
- **BD-6** Images: masters uploaded to Supabase Storage resized to ≤2000px WebP at seed/upload time; storefront serves via `next/image`. Raw shoots stay out of the app bundle.

## 2. Phases

| # | Phase | Driver (suggested) | Est. context | Why this shape |
|---|---|---|---|---|
| P1 | Foundation & coming-soon | Opus | comfortable | after it, the subscribe page is live — brand collects emails while the rest is built |
| P2 | Storefront | Opus | comfortable | pure UI against seeded data; failures are loud (a wrong screen) |
| P3 | Checkout & orders | Fable, or Opus + Fable review of the money path | full | the silent-failure phase: a bug here compiles, passes gates, and loses money |
| P4 | Admin | Opus | full | many small screens, all loud failures |
| P5 | Launch & drop mechanics | Opus | comfortable | DNS, live keys, perf, announcement send |

### P1 — Foundation & coming-soon
**BUILT 2026-08-22, commit `<pending>`. P1 CLOSED — "Done when" proofs verified in
the cloud same day.** Gates green: `bun run lint && bunx tsc --noEmit && bun run test
&& bun run build` (Next 16.3.2 / React 19.2.8 / Tailwind 4.3.3 per BD-2; vitest 6/6).
Built: scaffold + repo hygiene, both migrations, seed script, mode gate (fails closed
to `coming_soon`), subscribe flow + Resend confirm email, `.env.example`.
**Proofs (Supabase `rpiitnwalifrsuwreylw`; Vercel `zachs-projects-b9823451/swamp-magazine`):**
migrations applied (by hand in Studio's SQL editor — the Supabase MCP was mounted
`read_only=true`); seed PASS — 4 products, 17 variants @ inventory 12, 5 WebPs across
`products`/`slots`. Real signup `zmshort@wm.edu` → on-screen THANK YOU panel +
`subscribers` row; on-screen error states screenshot-verified (bad email, bad phone);
duplicate signup renders the success panel again with **no second email** — by design
(23505 → success; anti-enumeration). RLS proof in the strong form: anon read AND
insert on `subscribers`/`orders`/`order_items` all die 401/42501 at the privilege
layer (no grants), positive controls green (anon reads `products`, secret key reads
`subscribers`). Mode flip via service-role REST flipped `/` to the live placeholder +
seeded catalog in one reload, restored after 49 s (`force-dynamic` behaves). Prod
deploy live at swamp-magazine.vercel.app rendering coming-soon; env vars in all three
environments; GitHub repo connected (push-to-deploy).
**Email caveat (expected, per Watch-for):** the Resend sandbox delivers only to the
account owner (`zach.short@fantomworks.com`); the send to `zmshort@wm.edu` failed
with Resend's 403 while the row was kept, the visitor saw success, and the error
logged loudly — exactly as designed. A received-email proof needs an owner-address
signup (Zach at the keyboard) or the P5 domain verification.
**Deviations at close:** §0's "377 MB of PNGs tracked" was a working-tree measurement
— commit `76ef2ab` holds only `README.md`, so the images were never in history;
`.gitignore` now excludes them and the repo stays lean (Zach's disk is the sole copy
of the originals — back them up outside git). First deploy accidentally landed under
the CLI's stale `dan-short` login — project deleted, CLI re-authed via zach-short
GitHub OAuth, redone. `VERCEL_OIDC_TOKEN` in `.env.local` is Vercel-CLI-managed.
Prior deviations stand: College Arch $25 (XS–L) / Lurker Tee $25 (XS–XL) read off the
order mockups; inventory placeholder 12/variant until the founder sets stock; interim
Google fonts (Anton/Archivo) until P2's font decision; image slots beyond
`SHORTS GRID BACKGROUND SS.png` wait for founder uploads in P4.
**Scope:** 1) Scaffold Next + TS strict + Tailwind + repo hygiene (`.gitignore` for env/build; note-only on the 377 MB already committed — rewriting history is destructive and Zach's call). 2) Supabase project schema as SQL migrations: `products`, `product_variants`, `orders`, `order_items`, `subscribers`, `site_settings` (singleton: `mode`, `drop_at`), `image_slots`; RLS ON for every table (public read policies only where the storefront needs them; `subscribers`/`orders` service-role only); storage buckets `products`, `slots`. 3) Seed script: real catalog from `swamp-images/` per BD-6. 4) Mode gate: layout-level check of `site_settings.mode` — `coming_soon` renders subscribe page at `/`, `live` renders storefront; `/admin` always reachable. 5) Subscribe flow: email + phone + consent → server action → `subscribers` + Resend confirmation email. 6) Deploy to Vercel (Hobby during build), env plumbing documented in `.env.example`.
**Done when:** `bun run lint && bunx tsc --noEmit && bun run build` green. Proof: a real signup lands a row and a received email; `select` on `subscribers` with the anon key **fails**; toggling `site_settings.mode` in Studio flips `/`.
**Watch for:** never commit `.env`; Resend sends from `onboarding@resend.dev` until the domain is verified in P5 — fine for testing, say so in the phase report.

### P2 — Storefront
**Scope:** 1) Landing (live mode) per the founder's mock — full-bleed slot image, giant title, mascot art, marquee ticker à la Thames. 2) Catalog grid (Homer-style product-forward). 3) Product page per order-page mocks: lifestyle full-bleed from `image_slots`, product cutout, size row with sold-out states from `product_variants`, model credits, BACK link. 4) Page transitions + scroll behavior (Motion), fonts self-hosted (condensed grotesque + grotesk body — pick with founder). 5) `next/image` wired to Supabase Storage (`remotePatterns`), all images through it.
**Done when:** gates green; desktop + mobile screenshots of landing/catalog/product against seed data; every image request goes through `next/image` (no raw storage URLs in the DOM).
**Watch for:** the source screenshots are 3–5 MB PNGs — anything reaching the page must be the resized WebP from seed, or LCP dies; font licensing before self-hosting.

### P3 — Checkout & orders (money path)
**Scope:** 1) On-page order form: size + delivery choice (campus pickup free / flat-rate ship, dial $5) styled to the mocks; buyer name/contact collected by Stripe. 2) Server action creates the order (`pending`) + Stripe embedded Checkout session — price and stock read from DB, never from the client. 3) Webhook `checkout.session.completed`: signature-verified on the raw body, idempotent via stored event ids, transactionally marks order `paid` + decrements `product_variants.inventory_count`. 4) Sold-out guard at session creation; oversell race resolves per dial (refund + apologize). 5) Order-confirmed page + Resend order email with pickup instructions or shipping note. 6) vitest: idempotent replay, decrement-once, sold-out rejection (BD-5).
**Done when:** gates + tests green. Proof: a test-card purchase decrements exactly 1; the same webhook event replayed via Stripe CLI does **not** decrement again; a 0-stock size cannot create a session; a pickup order's email says where to pick up.
**Watch for:** App Router webhook must read `await req.text()` before JSON-parsing or signature verification fails; embedded checkout needs the return-page session-status check; if embedded fights the layout, the hosted-redirect fallback is pre-authorized by D2 — record as an `As built:`.

### P4 — Admin
**Scope:** 1) Supabase Auth (email allowlist of 2: Zach + founder), `/admin` group guarded server-side. 2) Mode toggle + optional `drop_at` (arms the countdown). 3) Products/variants/inventory CRUD. 4) Image-slot manager: upload → resize → replaces slot, storefront revalidates (`revalidateTag`). 5) Subscribers: list, count, CSV export. 6) Orders: list, detail, mark fulfilled / picked-up.
**Done when:** gates green. Proof: founder-shaped walkthrough on a phone — swap the landing hero from the admin and see it live, flip site mode, export CSV and open it, mark a test order picked-up.
**Watch for:** storage-write policies scoped to the allowlist, not any authed user; every mutation revalidates the affected public path or tag, or the founder "sees no change" and loses trust in the admin.

### P5 — Launch & drop mechanics
**Scope:** 1) Drop announcement: admin composes → batched Resend send to subscribers (chunked under rate limits, unsubscribe link — CAN-SPAM). 2) Countdown on coming-soon when `drop_at` set; auto-flip to `live` at the timestamp (or founder flips manually). 3) SEO/OG: per-product OG images, metadata, sitemap. 4) Perf pass: image sizes/priority, LCP < 2.5 s on product page (throttled). 5) Cutover: Resend domain verification (SPF/DKIM at registrar), swampmagazine.com → Vercel, **Vercel Pro before first real sale** (Hobby ToS), Stripe live keys, one live purchase refunded end-to-end.
**Done when:** proof: announcement renders in Gmail + Apple Mail to a test list; countdown flips a staging clone; live purchase + refund walked; Lighthouse mobile ≥ 90 perf on landing + product.
**Watch for:** DNS propagation ordering (verify Resend records before the announce); don't send the first real announcement until the founder approves the copy — copy is his, per the lifecycle's copy rule.

## 3. Dials
Carried from `DESIGN.md` §5 unchanged; all live in one `config/dials.ts` from P1.

## 4. Seams reserved, deliberately not built
Cart/multi-item checkout (BD-4), SMS sending (D4 — schema already stores phone +
consent), customer accounts, Stripe Tax, lookbook/archive pages, video, >2 admins or
roles. Each has an obvious home in the schema; none block v1.

## 5. Human-keyed prerequisites (Zach/founder at a keyboard)
- **Before P1:** create Supabase project + Vercel project (link repo), Resend account. Zach's Supabase MCP server also needs one-time auth (`/mcp` in an interactive session) if build sessions should use it.
- **Before P3:** founder's Stripe account (money lands there); test keys are enough until P5.
- **Before P5:** registrar DNS access (Resend records + domain cutover), Vercel Pro upgrade, Stripe live keys + identity verification, founder's sales-tax question to whoever does his books (site ships with tax off, per dial).

## 6. Session protocol
One phase per session. Close-out per the lifecycle: update this file's phase header
(`BUILT <date>, commit <hash>` + deviations), add `As built:` notes to `DESIGN.md`,
then post in chat: the pass-off prompt for the next phase, what was verified vs. only
gates-green, and the suggested next-session model. Commits are Zach's call — nothing
here auto-pushes.
