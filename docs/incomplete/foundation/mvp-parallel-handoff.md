# MVP parallel handoff — lanes beyond P2 (E–J)

Written 2026-08-22. Companion to `p2-handoff.md` (lanes A–D). The law stays
`DESIGN.md` (D1–D4) + `PLAN.md` (P3–P5 scope, BD-1..6). Zach's directive: build
the whole MVP as fast as parallelism allows. The discipline that survives:
**builds run in parallel, phases still CLOSE in order** (P2 → P3 → P4 → P5),
each with its §6 close-out and proofs. A lane finishing early parks its report;
nothing is "done" until its phase's proof list runs.

## Shared foundation for these lanes (already in place — do not rebuild)

- Deps installed: `stripe@22`, `@stripe/stripe-js`, `@stripe/react-stripe-js`
  (nobody touches `package.json`/`bun.lock` — ask the coordinator if you truly
  need a new dep).
- Env schemas extended (`lib/env/server.ts`, `lib/env/client.ts`,
  `.env.example`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `ADMIN_EMAILS` — all **optional at
  boot** so gates stay green before keys exist; consuming code must fail
  loudly at runtime when unset. **No lane edits the env files.**
- Frozen E↔F contract: `actions/create-checkout-session.ts` — typed input
  (`slug`, `size`, `delivery: "pickup" | "shipping"`), result union
  (`success {clientSecret, orderId}` | `error {reason: "invalid-input" |
  "not-found" | "sold-out" | "stripe-unconfigured" | "server-error"}`).
  Lane E implements the body; Lane F renders every reason.
- `scripts/flip-mode.ts`, dev server rules, and all coding conventions: see
  `p2-handoff.md` (bun only, kebab-case, named exports, no `any`/`enum`/
  `React.FC`, comments say why, tokens not hexes, images via `next/image`,
  no commits — Zach's call).
- Migration namespace (append-only files, so parallel lanes can't collide if
  they stay in their range): Lane E uses `202608230…`, Lane H uses
  `202608231…`. Every migration opens with a prose header explaining why.
  RLS on every new table; anything money- or PII-shaped gets NO anon policies.

## Lanes runnable NOW (parallel with P2's A/B/C)

### Lane E — P3 money path, server side (suggested driver: Fable; this is the
silent-failure zone — PLAN wants an adversarial review before P3 closes)
Owns: `actions/create-checkout-session.ts` (implement), `lib/stripe.ts`,
`app/api/stripe/webhook/route.ts`, `app/order/**` (order-confirmed page),
`emails/order-confirmation.tsx`, `supabase/migrations/202608230…_*.sql`, its
vitest files.
Scope (PLAN P3.2–P3.6):
1. Migrations: `stripe_events` (processed event ids → idempotency; service-role
   only) and a transactional RPC that marks the order `paid` + decrements
   `product_variants.inventory_count` atomically, refusing to double-apply.
2. `createCheckoutSession`: re-read price + stock from DB (never trust client),
   insert `pending` order + `order_items` snapshot, create the **embedded**
   Checkout session (`price_data` inline per BD-3, `ui_mode: "embedded"`,
   pickup free / shipping flat rate from `config/dials.ts`), return
   `clientSecret`. Sold-out guard at session creation. When
   `serverEnv.stripeSecretKey` is unset → `stripe-unconfigured`, loudly logged.
3. Webhook: `await req.text()` BEFORE parsing (signature dies otherwise),
   verify with `stripeWebhookSecret`, idempotent via `stripe_events`, then the
   transactional RPC; oversell race → dial policy (refund + apologize).
4. Order-confirmed page: session-status check per embedded-checkout return
   flow; Resend order email (pickup instructions vs shipping note) via the
   existing `serverEnv.resendFrom`.
5. vitest (BD-5): webhook replay does not double-decrement; decrement-once;
   0-stock cannot create a session. Test against constructed events +
   `stripe.webhooks.generateTestHeaderString` — no live keys needed.
**Blocked only at proof time** on Stripe test keys (Zach checklist below):
test-card purchase decrements exactly 1; Stripe CLI replay decrements 0; the
pickup email says where to pick up.

### Lane F — P3 order form, client side (unmounted until C lands)
Owns: `features/checkout/**` (new feature dir + its own barrel).
Build the on-page order form per the order mockups (`swamp-images/…11.31.00…`,
`…11.47.03…`): size row becomes selectable (sold-out sizes disabled), delivery
choice pickup (free) / ship (+$5 from dials), price restated, SUBMIT in the
mockups' voice, then swap to the embedded Checkout mount
(`@stripe/react-stripe-js` `EmbeddedCheckoutProvider` +
`clientSecret` from `createCheckoutSession`). Render every error reason
(`sold-out` → the size row updates; `stripe-unconfigured` → quiet "ORDERS OPEN
SOON" state — flag that copy to the founder). Style tokens/type per
`p2-handoff.md`. Do NOT touch `product-screen` — the mount happens in the P3
integration step after Lane C ships.

### Lane G — P4 admin foundation
Owns: `middleware.ts` (root), `app/admin/**` (replaces the P1 placeholder),
`features/admin/**` shell pieces, `lib/supabase/middleware.ts` if needed.
Scope (PLAN P4.1–P4.2 + subscribers):
1. Supabase Auth, magic-link email, allowlist = `serverEnv.adminEmails`
   (fail loudly if empty). Server-side guard on the `/admin` group — the
   middleware refreshes sessions; authorization happens server-side in the
   layout, not only in middleware. Non-allowlisted authed users get signed-out
   + denied, not a silent 404.
2. Admin shell: minimal, fast, phone-first (the founder drives from a phone —
   P4's proof is a phone walkthrough). Brand-red on cream, display type,
   nothing precious.
3. Mode toggle (`site_settings.mode`, optional `drop_at` setter armed for
   Lane J's countdown) + subscribers list (count, newest first) + CSV export.
4. Leave obvious route-segment seams: `/admin/products`, `/admin/slots`,
   `/admin/orders` land in Lanes H/I as sibling segments.
Needs from Zach before PROOF (not before build): `ADMIN_EMAILS` in
`.env.local`, email auth enabled in the Supabase dashboard.

### Lane J — P5-lite: drop mechanics that don't need the storefront
Owns: `features/coming-soon/**` (countdown), `lib/site-mode.server.ts` +
`lib/site-mode.ts` + `lib/site-mode.test.ts` (auto-flip), `app/layout.tsx`
metadata + `app/sitemap.ts` + OG plumbing, `app/unsubscribe/**` +
`actions/unsubscribe.ts`, `emails/drop-announcement.tsx` +
`actions/send-announcement.ts`, `config/dials.ts` (announcement batch-size
dial — J is the only lane allowed to edit dials).
Scope (PLAN P5.1–P5.3, build-now/fire-later):
1. Countdown on coming-soon when `drop_at` is set (server-rendered target,
   client ticks; no layout shift when absent).
2. Auto-flip: `resolveSiteMode` treats `drop_at <= now` as live (mode gate
   already reads per-request; pin with a vitest case; founder manual flip
   still wins).
3. Announcement: React Email template + batched Resend send (chunk under rate
   limits per the dial), every send carries the unsubscribe link; `/unsubscribe`
   sets `unsubscribed_at` (token — the subscriber id — in the link; no auth
   wall). Composer UI mounts in admin later (Lane H/I world); the action +
   template + a vitest on the chunking land now. DO NOT send anything —
   announcement copy is the founder's, and the send button arrives with admin.
4. SEO/OG: real metadata (title template, description from founder copy), OG
   image per product (route handler), sitemap of `/` + product slugs.

## Settle-point gate run (2026-08-22, uncommitted)

The whole wave (P2 lanes A–D, plus E/F/G/J and the P3 integration) verified
together on a cold `.next`: `rm -rf .next` → `bun run build` → `bunx tsc
--noEmit` → `bun run lint` → `bun run test`. **All green**: 15 routes compiled,
`ƒ Proxy (Middleware)` present (so Next 16.3.2 really does pick up `proxy.ts` as
the middleware entry, not just tolerate it), tsc exit 0, zero lint warnings,
72/72 tests across 12 files. The cold wipe is what cleared the stale
`.next/**/validator.ts` errors — a plain rebuild does not rewrite the
dev-server-generated `.next/dev/types` tree, so wipe rather than rebuild when
route types look wrong. P2 is fully closed. P3/P4/P5 remain open on the
human-keyed items below.

Operational note for the next session that needs the port: `lsof -ti:3000`
matches *clients* with connections to the port as well as the listener (Chrome
and the Claude app's network-service processes both show up). Use
`lsof -ti tcp:3000 -sTCP:LISTEN` or a kill aims at the wrong processes.

## Lane E — as built (2026-08-22, uncommitted; P3 still OPEN)

Facts that outlived this doc's assumptions. These are notes for the P3 close-out,
not amendments — DESIGN.md and PLAN.md remain the law.

- **`ui_mode` is `"embedded_page"`, not `"embedded"`.** `stripe@22.5.0` pins API
  version `2026-07-29.dahlia`, whose `ui_mode` union is
  `'elements' | 'embedded_page' | 'form' | 'hosted_page'` — the old `'embedded'`
  is gone (verify in `node_modules/stripe/cjs/resources/checkout/Sessions.d.ts`).
  The client side is unaffected: `@stripe/react-stripe-js@6`'s
  `EmbeddedCheckoutProvider` calls `createEmbeddedCheckoutPage` internally, so
  Lane F's mount pairs with it correctly. Same version moved the shipping address
  to `session.collected_information.shipping_details`; the old top-level
  `shipping_details` no longer exists.
- **The E↔F contract held unchanged.** `sold-out` is size-level only (a missing
  or inactive product returns `not-found`), which is what Lane F assumed. Post-
  payment is a `return_url` to `/order?session_id={CHECKOUT_SESSION_ID}` with
  Stripe's default redirect behaviour — not `redirect_on_completion: "never"` —
  so the form needs no `onComplete`.
- **Files:** `lib/stripe.ts`, `lib/checkout/{order-draft,checkout-completion}.ts`
  (+ three test files), `actions/create-checkout-session.ts` (implemented),
  `app/api/stripe/webhook/route.ts`, `app/order/page.tsx`, `features/order/**`,
  `emails/order-confirmation.tsx`, migration
  `20260823000000_checkout_money_path.sql`.
- **Idempotency is two guards, not one:** the `stripe_events` primary key stops a
  replayed event id, and a `pending → paid` compare-and-swap on the order stops a
  *different* event id for the same order (a completion followed by an async
  success). Either alone leaks a double decrement.
- **Oversell** clamps rather than aborting: the decrement carries a
  `inventory_count >= quantity` predicate, so a lost race leaves the order `paid`
  (the buyer really did pay) and the webhook refunds with idempotency key
  `oversold-refund-<orderId>` per `dials.oversellPolicy`.
- **Route-type gotcha for every lane:** Next only regenerates
  `.next/types/routes.d.ts` during `next build`, so `PageProps<"/new-route">`
  fails `bunx tsc --noEmit` for any route added since the last build even though
  the page renders fine. Type `params`/`searchParams` inline, or run `build`
  before `tsc` in the close-out gate order.
- **Constraint on Lane G:** `middleware.ts` must not match
  `/api/stripe/webhook`. Stripe POSTs there unauthenticated with a signature
  header; a session refresh or redirect turns paid orders into orders stuck at
  `pending` with stock never decremented, and no gate catches it.
- **Known limitation:** the confirmation email hangs off the once-only paid
  transition, so a crash between that commit and the send means no email is ever
  sent (a retry reports `already-applied`). Stripe's own receipt partly covers
  it; the admin order list is the backstop.
- **Un-keyed state shows the price.** P2's product page guaranteed "show the
  price plainly" wherever the order block isn't. Removing the standalone price
  station in favour of the form's ledger left the `stripe-unconfigured` branch
  with no price at all — the state prod renders today. That branch now states the
  bare price above the notice, with no delivery or total line implying you can
  buy yet. Verified live across all four SKUs: exactly one rendered price each
  (vamp-tee $20; star-shorts / college-arch / lurker-tee $25).
- **Copy flagged for the founder** (the whole invented list, per the copy rule):
  - `emails/order-confirmation.tsx` and `features/order/**` — every line is
    placeholder. The pickup line invents a fact: where and when campus pickup
    happens is his to state, and it currently promises a follow-up email rather
    than naming a spot.
  - `features/checkout/lib/order-copy.ts` — LIFTED: `SUBMIT` (verbatim from the
    mockups) and `SENDING...` / `SOMETHING BROKE. TRY AGAIN` (already shipped in
    P1's subscribe form). INVENTED and needing sign-off: `ORDERS OPEN SOON`,
    `PICK A SIZE`, `SOLD OUT`, `PICKUP`, `SHIP`, `FREE`, `TOTAL`, and the
    `invalid-input` / `not-found` / `sold-out` error lines.
  - Two visual calls for his eye: selected size and delivery render
    `brand-yellow` (extending P2's ratified reading that the mock's yellow is the
    active state), and SUBMIT is plain red display type with no box.
- **For DESIGN.md's P3 `As built:` at close-out** (recorded here so it lands as a
  choice, not drift): the ledger's `border-t` is the first rule line inside the
  product composition. Read as echoing the order mockups' field underlines; P2
  reviewed and accepted it.
- **P3 integration is DONE** (2026-08-22, after P2 closed and released Lane C).
  `product-screen.tsx` now mounts `CheckoutForm` through the `@/features/checkout`
  barrel in place of the display-only size row, and the standalone price station
  came out — the form's ledger is the only price on the page now, so the mock's
  "one number" reading survives. BACK, model credits, the cutout, the
  photo/ink-fallback background and the tokens-only art direction are untouched.
  The form's rows were centred (and SUBMIT re-centred) to keep the mockups'
  centre-stack composition.
  **Graceful degradation, added at integration:** when Stripe is unconfigured the
  form used to return only "ORDERS OPEN SOON", which stripped the size row off the
  product page entirely — a regression against what P2 shipped, and what prod
  would show today since it has no Stripe env vars. It now renders the sizes
  read-only (strike-through + `sr-only` "sold out" preserved) above the notice.
  Verified over the dev server in `live` mode: `/product/vamp-tee` serves all five
  sizes and `/product/star-shorts` all three, every image through `/_next/image`,
  no second price. `coming_soon` was restored immediately (the mode row is the
  shared cloud DB that prod reads).
### Adversarial review of the money path (PLAN P3 asked for one)

Run against a throwaway Postgres with both migrations applied and the races
executed as genuinely overlapping transactions — not reasoned about on paper.

**Survived every attack** (no change needed): same event id replayed, two
different event ids on one order, the same event id in two concurrent
transactions, two orders racing the last unit — one decrement in every case.
Grants verified on a real database: `has_function_privilege` is false for `anon`
and `authenticated`, true for `service_role`. (The REVOKE is not theoretical —
P1's `public.set_updated_at` has `proacl = null` on the live project, so a
function written without it really is anon-callable.) Raw-body signature
handling, the action's price/stock trust, and its write ordering all held.

**Defects found and FIXED:**
1. *Oversold refund was single-shot and swallowed* — the highest expected loss.
   The duplicate-event branch returned a constant `already-applied`, discarding
   the stored outcome, while `refundOversold` caught everything and answered 200.
   A failed refund was then unreachable by any automatic path, including a manual
   Dashboard resend: the buyer stayed charged for a thing that does not exist.
   Now the RPC replays the *stored* outcome, so a redelivered oversold event
   re-enters the refund, and `refundOversold` rethrows so the 500 buys Stripe's
   retry. Both steps were already idempotent (refund keyed
   `oversold-refund-<orderId>`).
2. *`order-not-found` was dead code* — `stripe_events.order_id` had a foreign key
   to `orders`, whose RI trigger fires on insert and aborts the transaction
   before the branch written to handle a missing order can run, leaving no audit
   row at all. The FK is gone; it was an audit column, and the moment it matters
   most is exactly when the order is missing.
3. *No site-mode gate on `createCheckoutSession`* — a server action is a public
   endpoint reachable by action id, so the product page's `mode !== "live"`
   redirect did not cover it. Products default to `active`, so inventory staged
   during `coming_soon` was purchasable while the storefront said the drop had
   not opened. Gated now.
4. *`unlinked` / `order-not-found` returned 200*, retiring a payment we could not
   attach to an order into the logs. Both now return 500 so the event stays in
   Stripe's failed-delivery list where someone will see it.
5. *An order with zero line items reported `applied`* — the loop simply never
   ran. Guarded.
6. *Unvalidated RPC outcome* — an unexpected string fell through the switch as
   `undefined` and answered 200. Now throws.
7. *Nothing recorded what an order should cost.* `orders.expected_amount_cents`
   is written at creation and the RPC flags `stripe_events.amount_mismatch` when
   Stripe charged something else. No exploit was found (line items are
   server-built, no promo codes, tax off) — this makes the absence checkable.
8. *The confirmation email had exactly one attempt* and could be lost silently to
   a function timeout after the RPC committed, quietly failing P3's "the pickup
   email says where to pick up". `orders.confirmation_sent_at` is now a claim: a
   conditional update takes it before sending so a redelivery cannot mail twice,
   and a failed send releases it so replaying the event delivers.
9. *The test model diverged from the SQL* on the branches that fail — it returned
   `order-not-found` cleanly where the SQL raised, and its duplicate check
   returned a constant, so it structurally could not express defect 1. Model
   corrected and two cases added (a redelivered oversold retries the refund; a
   redelivered applied does not re-mail).

**Left as a documented landmine, not fixed:** with several items per order the
ones that succeed stay decremented while the caller refunds the whole payment
intent. Unreachable under BD-4 (one item per order) and called out in the
migration; **the cart seam must fix it before shipping** — refund per line, or
raise so the transaction rolls back.

**Still open (accepted for now):** the action is unauthenticated and unthrottled,
so a hyped drop can bloat `orders` with abandoned pendings and burn Stripe rate
limits; no sweeper exists. `resolveOrigin()` trusts the `host` header, though no
victim-facing exploit was constructible (browsers set `Host` from the URL).

- **Blocked on Zach for the P3 proofs** (code is done): no Stripe keys in
  `.env.local` yet, so nothing has taken a test payment. The proofs still owed
  are PLAN's: test-card purchase decrements exactly 1, `stripe listen` replay
  decrements 0, a 0-stock size cannot create a session, and the pickup email says
  where to pick up. The migration also has to be applied by hand in the Studio SQL
  editor (Supabase MCP is read-only; no CLI/Docker on this machine) — the live
  schema was verified to match the P1 migration files exactly, so it applies
  cleanly.

## After the parallel wave

- **Lane H** (after G's shell): products/variants/inventory CRUD +
  image-slot manager (upload → sharp resize ≤2000px WebP → replace slot →
  `revalidateTag`/path) + `202608231…` migration for storage write policies
  scoped to the allowlist (P4 watch-for: allowlist, not any-authed).
  Owns `app/admin/products/**`, `app/admin/slots/**`, matching feature dirs.
- **Lane I** (after G's shell): orders list/detail, mark fulfilled/picked-up.
  Owns `app/admin/orders/**`. Buildable against the P1 schema before real
  orders exist (empty states are part of the job).
- **P3 integration** (after C + F): mount the order form on the product
  screen; then P3 proofs with live test keys (test-card decrement, CLI replay,
  0-stock rejection, pickup email) and §6 close.
- **P4 proof** (after G+H+I, and P2 for the storefront round-trip): the
  founder-shaped phone walkthrough from PLAN.
- **P5 close**: perf pass + cutover items — those DO depend on P2 and on
  Zach's human-keyed list; not parallelizable now.

## Zach's human-keyed checklist (everything agents can't do)

1. **Stripe test keys** → `.env.local` (`STRIPE_SECRET_KEY`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; webhook secret comes from
   `stripe listen` in dev). Founder's account is required before LIVE keys
   (P5); any account's test keys unblock P3 proofs now.
2. **`ADMIN_EMAILS`** in `.env.local` (yours now, founder's when known) +
   enable email (magic link) auth in the Supabase dashboard. **Also add Redirect
   URLs** under Supabase Auth → URL Configuration (`http://localhost:3000/**` and
   the Vercel URL) — this was NOT on the original list, and without it Supabase
   silently falls back to Site URL and the callback never fires. Optional, for
   links opened on a different device than they were requested from: set the
   Magic Link template to
   `{{ .SiteURL }}/admin/auth/callback?token_hash={{ .TokenHash }}&type=email`
   (the callback accepts both that and the default PKCE `?code=`; PKCE alone
   requires the same browser).
2b. **A postal address for the announcement footer** — CAN-SPAM requires one in
   every commercial send, and the template renders it only when supplied. Hard
   blocker on the first announcement, not on anything before it.
2c. **Apply the P3 migration by hand** in the Studio SQL editor
   (`20260823000000_checkout_money_path.sql`). The Supabase MCP here is
   read-only and there is no CLI/Docker on this machine. Verified: the live
   project has no `stripe_events` and no `apply_checkout_completion`, so until
   this runs every webhook 500s and every payment lands with its order stuck
   `pending`. The live schema was checked against the P1 files and matches, so it
   applies cleanly.
3. **Resend domain verification** at the registrar — can start today; DNS
   propagation is the P5 long pole and it unblocks real recipient email early.
4. Founder asks, batched: font pick, goblin mascot as standalone asset, clean
   lifestyle shots per product, real inventory counts, announcement copy.
5. Still open from P1: one signup at `localhost:3000` with
   `zach.short@fantomworks.com` completes the delivered-email proof.
6. At launch (P5): Vercel Pro, DNS cutover, Stripe live keys + identity
   verification.

## Conflict matrix (why these lanes can't collide)

Every lane owns a disjoint file set; the three historically-shared files
(`package.json`, `lib/env/*`, the E↔F action contract) were settled in the
foundation above; migrations are append-only in per-lane timestamp ranges;
dials belong to J; the barrel edits are each lane's own feature barrel. The
only sequenced joints are: G before H/I (shell), C+F before the P3 mount, and
phase closes in order.
