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
**BUILT 2026-08-22, commit `cadf7d2`. P1 CLOSED — "Done when" proofs verified in
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
**BUILT 2026-08-22, commit `82c01d9`. P2 CLOSED.** Built by parallel lanes A–C
per `p2-handoff.md`, verified and closed by Lane D the same session.
**Gates at close:** `bunx tsc --noEmit` green; vitest 51/51; lint clean on every
P2 file (2 warnings live in Lane J's in-flight `features/coming-soon` countdown
work — the MVP parallel wave per `mvp-parallel-handoff.md` shares this tree);
`bun run build` deferred to the wave's settle-point because it requires stopping
the dev server other active build sessions are using. Run the full gate line
before the P3 close.
**Settle-point gate run (2026-08-22, wave quiescent — lanes E–J all reported):**
full line green from a cold `.next` — `bun run build` ✓ (15 routes + proxy),
`bunx tsc --noEmit` ✓ (the stale generated-validator errors cleared with the
rebuild, as expected), lint ✓ zero warnings, vitest 72/72 ✓. Dev server
restarted after; `coming_soon` + `/product/*` 307 re-confirmed. P2's one
deferred gate item is closed.
**Proofs:** desktop (1280) + mobile (375) screenshots of landing, grid,
`/product/star-shorts`, `/product/vamp-tee` against seed data, shipped in chat;
sold-out visual proven against real data (vamp-tee M zeroed → captured →
restored to 12, ~15 s window); every `<img>` resolves through `/_next/image`
(0 raw storage URLs on `/` and product pages); LCP hero is the seeded WebP
(19.5 KB served at w=1920 — the 3–5 MB PNG hazard never reaches the page);
`/product/*` 307s to `/` in coming_soon; mode restored to `coming_soon` at
close (the DB is shared with prod, so live-mode verification windows should
stay short until P4's founder toggle exists).
**Deviations at close:** interim fonts stand (Anton/Archivo; founder pick still
open); ticker copy adapted — `"SWAMP MAGAZINE * THE FIRST ISSUE * "` (flag to
founder); goblin mascot + `landing_hero` + product backgrounds beyond
star-shorts await founder uploads (P4) — landing hero falls back to the
star-shorts lifestyle shot, product pages fall back to the ink ground (navy
Vamp Tee reads dark-on-dark there; resolves with P4 uploads); the mocks' order
block (NAME/PHONE/VENMO/SUBMIT) deferred to P3 — the plain price holds its
station; model credits render single-line as stored (mock stacks them; a
stored newline + one-word CSS change would restore that if the founder wants);
sold-out sizes carry a screen-reader-only "sold out" (invented copy, a11y —
flag to founder); shared primitives hardened during integration: marquee seam
fixed (`whitespace-pre` — the trailing space collapsed at the span boundary)
and `Reveal` now respects `prefers-reduced-motion`.
**Scope:** 1) Landing (live mode) per the founder's mock — full-bleed slot image, giant title, mascot art, marquee ticker à la Thames. 2) Catalog grid (Homer-style product-forward). 3) Product page per order-page mocks: lifestyle full-bleed from `image_slots`, product cutout, size row with sold-out states from `product_variants`, model credits, BACK link. 4) Page transitions + scroll behavior (Motion), fonts self-hosted (condensed grotesque + grotesk body — pick with founder). 5) `next/image` wired to Supabase Storage (`remotePatterns`), all images through it.
**Done when:** gates green; desktop + mobile screenshots of landing/catalog/product against seed data; every image request goes through `next/image` (no raw storage URLs in the DOM).
**Watch for:** the source screenshots are 3–5 MB PNGs — anything reaching the page must be the resized WebP from seed, or LCP dies; font licensing before self-hosting.

### P3 — Checkout & orders (money path)
**Scope:** 1) On-page order form: size + delivery choice (campus pickup free / flat-rate ship, dial $5) styled to the mocks; buyer name/contact collected by Stripe. 2) Server action creates the order (`pending`) + Stripe embedded Checkout session — price and stock read from DB, never from the client. 3) Webhook `checkout.session.completed`: signature-verified on the raw body, idempotent via stored event ids, transactionally marks order `paid` + decrements `product_variants.inventory_count`. 4) Sold-out guard at session creation; oversell race resolves per dial (refund + apologize). 5) Order-confirmed page + Resend order email with pickup instructions or shipping note. 6) vitest: idempotent replay, decrement-once, sold-out rejection (BD-5).
**Done when:** gates + tests green. Proof: a test-card purchase decrements exactly 1; the same webhook event replayed via Stripe CLI does **not** decrement again; a 0-stock size cannot create a session; a pickup order's email says where to pick up.
**Watch for:** App Router webhook must read `await req.text()` before JSON-parsing or signature verification fails; embedded checkout needs the return-page session-status check; if embedded fights the layout, the hosted-redirect fallback is pre-authorized by D2 — record as an `As built:`.

### P4 — Admin
**BUILT 2026-08-22, commit `f44fd68`. P4 CLOSED on W1–W6; W7 (orders) OWED.**
Gates re-run from a cold `.next` at close-out (not taken from the commit
message): `bun run lint && bun run build && bunx tsc --noEmit && bun run test` —
lint 0 warnings, build 21 routes with `ƒ Proxy (Middleware)`, tsc exit 0, vitest
99/99 across 15 files. **Note the gate order:** `build` must precede `tsc` on a
cold tree or the generated route types don't exist yet and tsc fails on
`PageProps`/`LayoutProps`; `CLAUDE.md`'s line still reads `lint && tsc && build`.
**Proofs** — the founder-shaped phone walkthrough, run by Zach 2026-08-22 and
recorded per-entry in the new `RUNTIME-PASS.md` (this project's first; P1's and
P2's proofs stay in their headers above and were deliberately *not* reconstructed
into it). W1 allowlist **both cases** — an address outside `ADMIN_EMAILS` is
bounced through sign-out and never reaches the shell; W2 mode toggle flipped `/`
to the storefront on one reload, no redeploy; W3 `drop_at` armed and reads back
in local wall-clock; W4 image swap — **verified independently of testimony**, see
below; W5 zeroing a size renders it sold-out on the storefront, restored after;
W6 subscriber count matches the DB (3) and the CSV opens as a spreadsheet.
**W4 is the headline and needed no one's word for it:** `landing_hero` and
`landing_mascot` were written at 16:37:53Z and 14:39:17Z as versioned-hash WebPs
(20 KB and 57 KB — the 3–5 MB phone masters really were resized), *after* commit
`f44fd68` deployed at 14:09:47Z, and production serves both through
`/_next/image` today. Content changed without a deploy. Slot counter 5/10 → 7/10.
**This closes two P2 deviations:** the landing hero no longer falls back to the
star-shorts lifestyle shot, and the goblin mascot exists.
**W7 — mark an order picked up — DID NOT RUN.** Blocked twice over, both
human-keyed: the P3 migration (`20260823000000_checkout_money_path.sql`) is still
unapplied on the live project, and Stripe is configured in **no** environment.
0 orders exist and none can be created. The orders screen renders its empty state
correctly (`features/admin/lib/orders.ts:16` selects only foundation columns).
**Ordering hazard:** the missing Stripe key currently *masks* the missing
migration — add a key first and the action reaches an insert against a column
that doesn't exist. Apply the migration **before** the keys.
**Deviations at close:** the mode flip ran **both directions** — live at 16:49Z,
back to `coming_soon` with `drop_at` cleared at 17:39:51Z — so the **exposure
window was ~50 minutes**, much longer than P1 (49 s) or P2 (~15 s). The intent
mid-session was to leave the site live; it was reverted before close. Visitors
during that window saw the full storefront with "ORDERS OPEN SOON" on every
product page — the graceful `stripe-unconfigured` branch, not an outage, and
nothing purchasable. End state matches the handoff's requested fixture:
`coming_soon`, `drop_at` null. One sub-case went unproven and is not claimed:
`drop_at` in the *past* opening the store (vitest covers it; nobody saw it), and
one was unexercisable — an unsubscribed row rendering as unsubscribed in the CSV,
since all 3 subscribers are active. **A real defect surfaced and was fixed:** the
DROP TIME `datetime-local` input overflowed its container on iOS, spilling past
the SET/CLEAR buttons, because a flex item's `min-width: auto` beats `w-full`
against that control's intrinsic width — `min-w-0` on
`site-mode-controls.tsx:161`. Desktop never showed it; only the phone did, which
is the argument for the walkthrough's shape. **Also observed:** the pass was run
against `swampmagazine.com` — DNS is pointed and the apex redirects to `www`.
That is a P5 cutover item that happened early; P5 is *not* entered and its
remaining items (Resend domain verification, Vercel Pro, live keys) still stand.
Storage writes went through the service
role behind the admin guard rather than the allowlist-scoped bucket policies the
watch-for asked for — strictly tighter, and the `202608231…` migration that would
have carried those policies was never written. W1 incidentally closed the
long-standing "unverified" flag on Supabase Auth: the magic link arriving proves
the email provider and the Redirect URLs are both configured.
**Found but not fixed** (out of P4's scope, queued in `admin-completion`): the
dashboard renders `subscribers.total`, which counts unsubscribed rows, where it
should render the `active` figure already returned beside it — today both are 3,
so the wrong number is accidentally right and W6 could not have caught it.
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
