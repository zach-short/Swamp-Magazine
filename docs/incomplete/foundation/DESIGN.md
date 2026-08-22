# Foundation — stack, services, and v1 shape

**Status: RATIFIED 2026-08-22** (GATE 1, batched in chat).
Process adapted from `~/Projects/ezhomesteading/docs/feature-lifecycle.md`. Decisions
D1–D4 below are frozen: they change by dated amendment (a new `D<n>` or an `As built:`
note), never by editing in place. The options in §3 are the historical record of what
was weighed.

---

## 1. What exists today (verified 2026-08-22)

| Claim | Verified state | Citation |
|---|---|---|
| Repo is empty of code | One commit (`76ef2ab`), only `README.md` (repo name) + images | `git log`, repo root |
| Remote | `github.com/zach-short/Swamp-Magazine` | `git remote -v` |
| Domain | swampmagazine.com purchased (per Zach, 2026-08-22); DNS not yet pointed | chat |
| Design direction exists | Full page mockups by the founder: landing page ("SWAMP MAGAZINE … FROM LALO FARRO", full-bleed film photo, goblin mascot line art) and per-product order pages | `swamp-images/Screenshot 2026-08-20 at 11.19.45 AM.png`, `…08-21 at 11.47.03 AM.png`, `…08-21 at 11.31.00 AM.png` |
| Current order-flow concept | On-page form: NAME / PHONE / ADDRESS + size row (XS–XL or S/M/L) + "PLEASE VENMO $20–25 @lalo-farro / SUBMIT". No cart — one product, one order | same mockups |
| Catalog scale | A handful of SKUs: Vamp Tee ($20), Star Shorts ($25), College Arch tee, Lurker piece; product cutout shots on white exist | `swamp-images/*GRID*.png`, `STAR SHORTS GRID - AUG 9.png` |
| Aesthetic references | A24 (editorial type, whitespace), Homer (catalog grid, product-forward), Thames (marquee tickers, deep color fields, illustrated logo) | `inspiration-images/` |
| Assets in git | 377 MB of PNGs already committed (`swamp-images` 309 MB, `inspiration-images` 68 MB) | `du -sh`, 2026-08-22 |

Requirements stated in chat 2026-08-22: purchases through the site (Stripe assumed);
mostly campus orders at William & Mary plus some shipped; image/animation-heavy;
admin dashboard with a site-wide view toggle for drop phases (coming-soon ↔ live);
email or phone subscription during pre-drop; founder can upload images into set
places and generally control content.

## 2. What this is / What this is not

**This is:** a bespoke storefront for a tiny catalog with drop mechanics — landing,
product pages matching the founder's mockups, checkout with campus pickup + shipping,
a subscribe flow, and an admin surface (site mode, products/inventory, image slots,
subscribers, orders).

**This is not (v1):** customer accounts, cart with multi-item checkout (mockups are
one-product-per-order; a cart can come later), search, reviews, international
shipping, sales-tax automation, a native app, video pipeline, Instagram API embeds,
multi-admin roles. Each is parked, not rejected.

## Ratified decisions (GATE 1, 2026-08-22)

**D1 — Core platform: custom Next.js (App Router) + Supabase (Postgres/Auth/Storage)
+ Stripe, deployed on Vercel.** Defense: the aesthetic is the product and doesn't fit
template systems; one codebase carries storefront, admin, and drop toggle; Zach
already ships this stack. Accepted cost: commerce ops (orders, refunds, inventory
edges) are ours to build and maintain. Shopify (O1-B) and static (O1-C) rejected —
reasons recorded in §3.

**D2 — Checkout is embedded Stripe, on-page, Stripe-only.** Size and pickup/shipping
choice styled natively per the mockups; card step via Stripe embedded checkout on
swampmagazine.com. The manual Venmo path (O2-C) was offered and **not selected** —
launch is Stripe-only; revisit only if the founder asks. Hosted redirect (O2-B)
stands as the recorded fallback if the embedded flow fights us, and switching to it
is a build-level call, not a design change.

**D3 — v1 admin is the full custom admin** (O3-A): site-mode toggle, products +
variants + inventory CRUD, image-slot uploads, subscriber list + CSV export, orders
with fulfillment states, behind a Supabase Auth email allowlist of 2. Payload and
minimal-v1 rejected; reasons in §3.

**D4 — Notifications: email now via Resend; subscribe form collects phone from day
one, but SMS sending waits for A2P 10DLC registration** and never gates launch.
Consent language on the form covers both channels from the start.

**Rules that survive unchanged:** the non-scope list in §2 stands (each item parked,
not rejected); the dials in §5 remain config defaults, not ratified numbers.

## 3. Options

### O1 — Core platform

**A. Custom app: Next.js (App Router) + Supabase (Postgres/Auth/Storage) + Stripe, on Vercel. — proposed recommendation**
Defense: the aesthetic *is* the product — A24/Homer/Thames are all bespoke builds, and
the founder's mockups (full-bleed photo, type overlays, on-page order form) don't fit
any template system. One codebase carries storefront + admin + drop toggle. Zach
already ships Next + Supabase (ezhomesteading), including the RLS posture. Fixed cost
≈ $0 during build, ~$20/mo at launch (hosting; see hazards). Strongest counter: we
own everything Shopify would give free — order ops, refunds, inventory edge cases,
receipt emails. At ~5 SKUs and campus volume that surface is small, but it is real
work, and it's on us when it breaks.

**B. Shopify Basic + custom storefront (Next.js + Storefront API).**
Defense: commerce ops solved — inventory, refunds, fraud, order emails, a phone admin
app for the founder. Counter: ~$29–39/mo forever + the same card fees; checkout is
Shopify-hosted on Basic (breaks the on-page-form aesthetic); the site-mode toggle and
image-slot control still have to be custom-built, now split across two systems. All
of the animation/frontend work remains. Overkill for the catalog size.

**C. Static site (Astro) + Stripe Payment Links.**
Defense: cheapest, fastest. Counter: fails the stated requirements — no admin toggle,
no uploads, no inventory, no subscriber list we own; every drop is a redeploy.
Recorded so it isn't re-proposed.

### O2 — Checkout experience (within Stripe)

**A. Embedded checkout on-page. — proposed recommendation** Size + delivery choice
styled natively to match the mockups; card step via Stripe's embedded checkout/
Payment Element on our domain. Defense: the mockups are an on-page form; a redirect
to stripe.com breaks the spell. Counter: slightly more code than a redirect.
**B. Hosted Stripe Checkout (redirect).** Least code, most battle-tested; fine as a
fallback if A fights us.
**C. Keep a manual Venmo path** ("Venmo @lalo-farro, mark as paid in admin") beside
Stripe for campus buyers. Defense: it's the founder's current flow and campus-native;
zero fees. Counter: manual reconciliation, no automatic inventory decrement — needs
an admin "mark paid" step. Compatible with A or B.

### O3 — Admin scope for v1

**A. Full custom admin. — proposed recommendation** `/admin` behind Supabase Auth
(email allowlist of 2): site-mode toggle (coming_soon ↔ live), products + variants +
inventory CRUD, image-slot uploads (landing hero, per-product background, product
cutout), subscriber list + CSV export, orders list with fulfilled/picked-up state.
Defense: exactly the control asked for, no third system to learn; small because the
catalog is small. Counter: every screen is hand-built.
**B. Minimal v1 admin** (mode toggle + subscribers + orders only; product/image edits
done by us in Supabase Studio until the full admin lands). Defense: ships sooner.
**C. Payload CMS embedded in the Next app.** Defense: admin UI, uploads, drafts for
free. Counter: heavier dependency, its data model fights the drop/inventory shape,
and the founder still needs custom screens for mode + orders.

### O4 — Drop notifications

**A. Email now via Resend; collect phone numbers now, wire SMS later. — proposed
recommendation** Defense: Resend free tier (~3k emails/mo) covers campus scale; US
SMS requires A2P 10DLC brand/campaign registration (fees + weeks of carrier vetting)
before a single text sends, so day-one SMS would gate the launch. Collecting the
phone field now keeps the mockups' shape and the option open. Counter: "text me when
it drops" is the streetwear-native channel; email open rates are worse.
**B. Email only** (drop the phone field). **C. Email + SMS from day one** (accept the
Twilio registration cost/delay).

### O5 — Hosting

Vercel (proposed: Hobby during build, Pro $20/mo at launch — Hobby's terms prohibit
commercial use) vs Cloudflare via OpenNext (free commercial tier, more deploy
friction). Vercel tooling is already wired into Zach's setup. Treated as a dial, not
a gate question, unless Zach objects.

## 4. Proposed v1 shape under O1-A (sketch, for scale)

- **Pages:** landing (mode-aware: coming-soon/subscribe vs live), catalog grid,
  product/order page per mockups, order-confirmed, `/admin/*`.
- **Data:** `products`, `product_variants` (size, inventory_count), `orders` +
  `order_items`, `subscribers` (email, phone, consent, created_at), `site_settings`
  (singleton: mode, drop_at), `image_slots` (slot_key → storage path, alt). RLS on
  everything; public reads via server components; writes only via server
  actions/webhooks; admin via allowlist.
- **Payments:** Checkout session built server-side from DB prices; delivery choice =
  campus pickup (free) or flat-rate shipping; `checkout.session.completed` webhook
  (idempotent) records the order and decrements inventory.
- **Frontend flavor:** Tailwind v4, Motion for transitions, marquee ticker à la
  Thames, `next/image` over Supabase Storage originals; fonts self-hosted (mockups
  use a condensed grotesque for overlays — settle in the design phase).
- **Email:** Resend + React Email (subscribe confirm, drop announcement, order
  confirmation with pickup instructions).

## 5. Dials (config, defaults proposed, none ratified)

| Dial | Default | Note |
|---|---|---|
| Shipping flat rate | $5 | founder's call; Stripe shipping_options |
| Site modes | `coming_soon` \| `live` | `drop_at` timestamp optional for countdown |
| Oversell policy | check stock at session create; on webhook race, refund + apologize | real reservation is overkill at this scale |
| Venmo path enabled | per O2-C answer | |
| SMS enabled | off until A2P registered | per O4 |
| Vercel plan | Hobby → Pro at launch | see hazards |
| Stripe Tax | off | VA sales-tax registration is a business question for the founder, outside the codebase; flag it to him |

## 6. Hazards this work walks into

- **377 MB of PNGs in git** (measured 2026-08-22). Fine for now; before the repo
  grows, canonical media should move to Supabase Storage and raw shoots out of the
  repo — otherwise every clone drags the archive. Decide at build time, not now.
- **Vercel Hobby prohibits commercial use.** The moment checkout goes live it's Pro
  ($20/mo) or Cloudflare. Budget line for the founder.
- **Stripe webhooks:** must be idempotent (store event ids), and inventory decrement
  must be transactional — the classic silent-failure zone the lifecycle doc reserves
  for careful review.
- **Supabase free tier** pauses after ~1 week of inactivity (fine once live traffic
  exists) and caps storage/egress (~1 GB / ~5 GB) — image-heavy pages should serve
  through the Vercel image cache to stay under egress caps; upgrade trigger is
  storage, not compute.
- **SMS compliance:** A2P 10DLC registration before any marketing text; consent
  language on the subscribe form either way.
- **swampmagazine.com DNS** not yet pointed; do it at first deploy so the coming-soon
  mode is the first thing anyone sees.
- Supabase MCP server in Zach's Claude setup needs one-time auth (`/mcp` in an
  interactive session) before build phases can use it.

## As built (P1, 2026-08-22)

- **D1 re-affirmed in-session:** Zach floated a separate Go backend for speed
  (his ezhomesteading pattern); declined after discussion — felt speed here is
  images/CDN, not backend language, and a second service adds a hop. Server
  actions + one webhook route handler carry the whole backend surface.
- **Supabase Data API change (2026-04-28):** new tables are no longer
  auto-exposed, so migrations carry explicit `GRANT`s — SELECT to
  anon/authenticated only on `products`/`product_variants`/`site_settings`/
  `image_slots`; `subscribers`/`orders`/`order_items` get no grants and no RLS
  policies (service-role only), which *is* the RLS posture ratified here (unlike
  ezhomesteading's deny-all-with-Go-owner).
- **Mode gate fails closed:** any read failure renders `coming_soon`, never the
  storefront. Pinned by vitest (BD-5's "mode gating").
- **Subscribe consent (D4):** no checkbox — the form's disclosure line covers
  both channels; submitting = email consent, leaving a phone = `sms_consent`.
  Copy on page + thank-you state lifted from the founder's mockups.
- **Key naming:** new-style Supabase keys (`sb_publishable_…`/`sb_secret_…`);
  env zod-validated in `lib/env/`, never read raw.
- **Catalog facts extended from order mockups:** College Arch $25 (XS–L),
  Lurker Tee $25 (XS–XL); model credits captured per product (KIRBY-ANA,
  MIA/DAVID, ANANYA/JESSICA, JOE).

## As built (P1 close — cloud proofs, 2026-08-22)

- **RLS held in the strong form:** anon holds no grants at all on
  `subscribers`/`orders`/`order_items`, so reads AND writes die at the privilege
  layer (SQLSTATE 42501 → HTTP 401) before RLS evaluation is even reached; the
  same anon key reads the public catalog fine. Duplicate signup intentionally
  re-renders the success panel and skips the second email (23505 → success;
  prevents email enumeration and resend spam).
- **Resend account fact:** registered to `zach.short@fantomworks.com`; the
  sandbox sender (`onboarding@resend.dev`) delivers only to that address until
  the domain is verified in P5. D4 unchanged — the send failure is logged
  loudly while the subscriber row is kept and the visitor sees success.
- **Images-in-git correction:** §1's "377 MB already committed" was a
  working-tree measurement — `76ef2ab` tracks only `README.md`. The PNGs were
  never in history and are now gitignored; resized derivatives live in Supabase
  Storage (BD-6), originals only on Zach's disk (needs an off-repo backup).
- **Hosting as built:** Vercel project `zachs-projects-b9823451/swamp-magazine`
  under Zach's account (zach-short GitHub OAuth — never `dan-short`), repo
  connected for push-to-deploy, prod at swamp-magazine.vercel.app on Hobby —
  Pro before the first real sale, per §6's hazard. Supabase project
  `rpiitnwalifrsuwreylw`.

## As built (P2, 2026-08-22)

- **Landing and product pages follow the founder's mocks**; the one structural
  substitution: the mocks' order block (NAME/PHONE/ADDRESS + VENMO/SUBMIT) is
  P3's embedded-checkout scope per D2, so the plain price stands in the mock's
  Venmo station until the form mounts there.
- **Catalog grid (no founder mock)** built to the Homer reference ratified in
  §1: cutouts floating on flat cream, centered micro-labels (name + whole-dollar
  price in vermillion), 2-col mobile / 4-col desktop, whole cell links to the
  product page. The seeded cutout WebPs are genuinely transparent — no matte
  workarounds needed.
- **Model credits** are stored and rendered single-line (`MIA (L), DAVID (R)`);
  the mocks stack them two-line. If the founder wants the stack, store a
  newline and render `whitespace-pre-line` — content change, not a redesign.
- **Sold-out sizes**: dimmed + line-through per the visual language, plus a
  screen-reader-only "sold out" so the state isn't color/decoration-only.
- **Motion language locked**: one scroll-entrance primitive (`Reveal`, now
  `prefers-reduced-motion`-aware), a quiet route fade, and the CSS marquee —
  nothing else moves.

## As built (P4, 2026-08-22)

Implements D3 (the full custom admin). All six of D3's items shipped; what
follows is where the build differs from what D3 and `PLAN.md` §P4 described.

- **Storage writes go through the service role behind the admin guard**, not
  through allowlist-scoped bucket policies. P4's watch-for asked for policies
  "scoped to the allowlist, not any authed user"; this is strictly tighter than
  that — a signed-in non-admin has no path to storage at all, because the only
  writer is a server action that runs `resolveAdminAccess()` first. The
  consequence to know: the buckets have no write policies of their own, so any
  future client-side upload has to add them deliberately rather than inheriting
  them.
- **Orders are an accordion, not an `/admin/orders/[id]` route.** A deliberate
  phone-first call (`order-card.tsx:15`): the founder's queue is short and a
  detail route costs a round trip per order. Order writes match on the expected
  current status, so a webhook landing mid-tap reports stale rather than
  clobbering.
- **`sharp` moved to `dependencies`** (not `devDependencies`) because the
  image-slot manager resizes at request time rather than only at seed time. BD-6
  assumed resize happened at seed/upload in a script; half of it now runs in a
  server action.
- **Image slots are versioned, never overwritten.** An upload mints a new
  `<slot_key>-<hash>.webp`, repoints the row, and deletes the old object last.
  So a failed upload can't leave a slot pointing at nothing, and the storefront
  never serves a half-written file. Verified in production at close: a hero
  written after the running deploy was live on the next load, no redeploy.
- **The mode gate stays global and fail-closed.** D3 named an admin; it did not
  name an admin *preview*. Verifying the storefront still means flipping the
  shared production row, which every phase so far has done and P4 did again.
  That cost is now recorded rather than assumed — it is the standing argument
  for the signed-admin preview scoped in `admin-completion` §3 O-B.
- **The allowlist is `ADMIN_EMAILS` + a redeploy.** Correct at two people, and
  D3 said two. The founder cannot add an admin himself; that is the accepted
  trade, not an oversight.

## 7. Open questions → GATE 1

Asked and answered in chat 2026-08-22; recorded above as D1–D4. Nothing remains open
at design level. Build-level calls (BD-n) live in `PLAN.md`.
