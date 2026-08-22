# Admin completion — scope

**Status: SCOPING.** GATE 1 asked 2026-08-22; three of four answered then
(§7), the fourth — sequencing — held at Zach's instruction ("stop here") and
**answered 2026-08-22** in §8.2: **P4 closes first, this project waits.**
One question remains open and is the founder's, not Zach's (§8.9, §8.10).
Entered at Stage 2 per `~/Projects/ezhomesteading/docs/feature-lifecycle.md`
("Entering in the middle": an audit produces its findings as Stage 1 output and
then enters at Stage 2). Stage 3 not entered; this file is not renamed.

This doc **proposes and decides nothing**. Options in §3 carry recommendations;
the answers become `D1…Dn` when Stage 3 renames this to `DESIGN.md`.

It does not re-open `foundation/DESIGN.md` D3 (the full custom admin, ratified
2026-08-22). D3's six items are all built. This is about what D3 did not name.

---

## 1. What exists today (verified 2026-08-22)

### 1.1 D3 / `foundation/PLAN.md` P4 scope — all six items code-complete

| P4 item | Verified state | Citation |
|---|---|---|
| 1. Supabase Auth, allowlist of 2, `/admin` guarded server-side | Built. Fails closed twice: an unset `ADMIN_EMAILS` denies everyone, and merely-authenticated is nobody. `getClaims` verifies the JWT signature, so the email is Supabase's, not a cookie's | `features/admin/lib/admin-allowlist.ts:14`, `features/admin/lib/admin-guard.ts:25`, `app/admin/(guarded)/layout.tsx:24` |
| 2. Mode toggle + `drop_at` | Built. Two-tap confirm to close the shop; closing disarms a *spent* countdown but leaves a future one alone | `features/admin/components/site-mode-controls/site-mode-controls.tsx:104`, `features/admin/lib/site-settings.ts:74` |
| 3. Products / variants / inventory CRUD | Built. Price parsed through `lib/money`, not float-multiplied; new products created hidden; slug settable only at create | `actions/admin-products.ts`, `features/admin/lib/products.ts:143` |
| 4. Image-slot manager | Built. Closed slot list from the live product table, sharp resize to 2000px WebP, **new versioned path then repoint** (never overwrite-in-place), old object removed last | `actions/admin-image-slots.ts:41`, `features/admin/lib/image-slots.ts:88` |
| 5. Subscribers list + count + CSV | Built. List capped at 200, export uncapped, route handler re-runs the guard itself | `features/admin/lib/subscribers.ts:14`, `app/admin/(guarded)/subscribers/export/route.ts:17` |
| 6. Orders list + detail + fulfilled/picked-up | Built as an accordion, not a `[id]` route. Writes match on expected current status so a webhook landing mid-tap reports stale | `features/admin/components/order-card/order-card.tsx:21`, `features/admin/lib/orders.ts:155` |

Every mutation revalidates its public surface (`actions/admin-site-settings.ts:78`,
`actions/admin-image-slots.ts:95`) — P4's stated watch-for is honoured.

### 1.2 What P4 still owes before it can be marked BUILT

> **SUPERSEDED 2026-08-22 — P4 is closed.** Every row below except the last two
> is discharged: the walkthrough ran (W1–W6), `RUNTIME-PASS.md` exists, and both
> the `PLAN.md` header and the `DESIGN.md` `As built` section are written. Still
> true: **the P3 migration is unapplied** and — per §8.1 — **Stripe is
> configured in no environment**, which together leave W7 (mark an order picked
> up) as P4's one unproven item. Kept unedited as the audit's record of the day.

| Claim | Verified state | Citation |
|---|---|---|
| Founder-shaped phone walkthrough (P4's whole "Done when") | **Not run.** The commit says so in its own message | `git show f44fd68` |
| Its named blocker, `ADMIN_EMAILS` | **Now cleared.** Present in `.env.local` and in Vercel Production + Preview (set 60 min before this audit) | `.env.local`, `vercel env ls production` 2026-08-22 |
| Supabase Auth email provider + Redirect URLs | Unverified from here — dashboard state, not repo state. Handoff flags it as the silent failure: without Redirect URLs the callback never fires | `mvp-parallel-handoff.md` §checklist item 2 |
| `PLAN.md` P4 header | Still has no `**BUILT <date>, commit <hash>**` line | `docs/incomplete/foundation/PLAN.md` §P4 |
| `DESIGN.md` P4 `As built:` | Absent (P1 and P2 have theirs) | `docs/incomplete/foundation/DESIGN.md` |
| `RUNTIME-PASS.md` | **Does not exist** for this project at all. Stage 7 says each phase writes its own entries as it goes | `ls docs/incomplete/foundation/` |
| P3 money-path migration on the live DB | **NOT APPLIED.** `stripe_events` absent, `apply_checkout_completion` absent, `orders.expected_amount_cents` absent | live query, project `rpiitnwalifrsuwreylw`, 2026-08-22 |
| Live data behind the orders screen | 0 orders, 4 products / 17 variants, 3 subscribers, 5 image slots, mode `coming_soon`, `drop_at` null | same query |

Consequence worth stating plainly: the **orders half** of P4's walkthrough
cannot be proven until the P3 migration is applied by hand and Stripe test keys
exist. The other five items can be walked today. `features/admin/lib/orders.ts`
deliberately selects only foundation columns (`orders.ts:16-20`), so the admin
does not break on the un-applied migration — it just has nothing to show.

### 1.3 Verified gaps and drift inside the admin as built

| Finding | Verified state | Citation |
|---|---|---|
| **The announcement engine has no cockpit** | `sendDropAnnouncement` is complete — paged recipients, consent re-checked at send, 100-per-batch, idempotency key per batch, `List-Unsubscribe` header — and has **exactly one occurrence in the repo: its own definition.** Zero callers | `actions/send-announcement.ts:67`; `grep -rn sendDropAnnouncement` |
| **Dashboard promises a count it does not render** | `isAwaitingHandover`'s TSDoc says it "drives the count on the dashboard and the default filter". The dashboard renders only mode controls + a subscriber link, and the orders screen has no filter | `features/admin/lib/order-status.ts:96` vs `admin-dashboard-screen.tsx:14`, `admin-orders-screen.tsx:15` |
| **No admin preview of the live storefront** | The mode gate is global and has no signed-in bypass; `proxy.ts` is scoped to `/admin` only. Every phase so far verified the storefront by flipping the **shared production** row and racing to restore it (49 s in P1, ~15 s in P2) | `lib/site-mode.ts:18`, `app/page.tsx:9`, `proxy.ts:15`; `PLAN.md` §P1/§P2 |
| **Abandoned `pending` orders have no handling** | The money-path review left this open: `createCheckoutSession` is unauthenticated and unthrottled, no sweeper exists. The admin offers no action on a `pending` row and no way to hide them | `mvp-parallel-handoff.md` §"Still open"; `features/admin/lib/order-status.ts:51` |
| **Stock is never visible at a glance** | Inventory is editable per variant inside a collapsed accordion; nothing anywhere says "3 left" | `features/admin/components/product-editor/product-editor.tsx` |
| **No money figure anywhere in the admin** | Per-order totals render; nothing sums | `order-card.tsx:40` |
| **Payment intent id is printed but not linked** | Rendered as dim text next to the order id. Refunds are deliberately absent (Stripe owns them) — but there is no way to *get* to Stripe from the order | `order-card.tsx:132`, `order-status.ts:39` |
| **Storefront copy is hardcoded** | The ticker line and the coming-soon line are string literals in TSX. The founder already owes a ruling on the ticker copy (P2 deviation) | `live-landing-screen.tsx:65`, `coming-soon-screen.tsx:65` |
| **Subscriber ops are SQL-only** | No manual unsubscribe and no delete. A deletion request is a hand-written query today | `features/admin/lib/subscribers.ts` (read + export only) |
| **List caps are silent** | Orders 100, subscribers 200. Both render a "showing the newest N" line, neither can page | `orders.ts:82`, `subscribers.ts:14` |
| **No audit trail** | Every admin write goes through the service role with no record of which of the two admins made it | `lib/supabase/admin.ts` callers |
| **Allowlist is env + redeploy** | Adding an admin is `ADMIN_EMAILS` + a deploy. Correct at two people; the founder cannot do it | `lib/env/server.ts:22` |

---

## 2. What this is / What this is not

**This is:** finishing P4's close-out obligations, mounting the composer for an
announcement engine that is already written and tested, and a batch of
founder-facing admin capability that D3 never named — chosen for a person
running a drop from a phone.

**This is not:** re-opening D3, D2, or BD-4. Not a cart admin. Not customer
accounts. Not multi-admin roles or per-role permissions. Not analytics beyond a
sales figure the founder can read in one glance. Not an in-admin refund flow
unless §3 O-D says otherwise. Not a redesign of any screen that shipped.

---

## 3. Options

### Track A — P4 close-out debt (work list, not options)

Belongs to `foundation`, not to this folder: the phase header, the `As built:`
paragraphs, and the missing `RUNTIME-PASS.md` are Stage 5–7 obligations of P4
itself. Listed here only so the audit is complete. The one real decision is
whether this project waits on it — see §6 Q1.

### O-A — The announcement composer

**A. Mount it in the admin now. — recommended.** A compose screen (subject,
headline, body, CTA label, postal address) behind the guard, calling the action
that already exists, with a recipient count shown before sending and a
type-to-confirm gate on the send itself.
*Defense:* the expensive, dangerous half is built and adversarially reasoned
about; what is missing is a form. It is also the one admin action that cannot be
undone, so it should not be first exercised from a script or the Supabase
dashboard on drop day. *Strongest counter:* `PLAN.md` puts it in P5, and P5 also
owns Resend domain verification — a composer that can only mail
`zach.short@fantomworks.com` cannot be fully proven yet. Real, but the composer
is provable against a one-address list today, and the founder's copy is a P5
blocker either way.

**B. Leave it to P5.** Fewer moving parts now; accepts that drop day is the
first time anyone touches the send path through a UI.

**C. Ship a send-preview only** (renders the email, no send button) now, send in
P5. Half the value, most of the code.

### O-B — Preview the live storefront while the site is closed

**A. Signed-admin preview bypass. — recommended.** A signed-in allowlisted
request renders the storefront while the public still sees coming-soon, with a
persistent on-screen "PREVIEWING — VISITORS SEE COMING SOON" bar.
*Defense:* three phases in a row verified the storefront by flipping the shared
production row and restoring it seconds later (`PLAN.md` §P1, §P2). That is a
real production exposure repeated as routine practice, and it gets worse once
there is money on the other side of the toggle. *Strongest counter:* it puts a
conditional into the one gate whose entire design is *fail closed*
(`lib/site-mode.ts:3`), and a bug there is the worst bug in the app. Mitigation:
the bypass reads the same `resolveAdminAccess()` the admin does, is additive
(never turns `live` into `coming_soon`), and gets its own vitest case.

**B. Share-link preview token** — a signed URL, no session needed, so the
founder can send it to a friend. More surface, more to get wrong.

**C. Do nothing.** Keep flipping prod for short windows.

### O-C — The drop dashboard

**A. One screen: awaiting-handover count, units sold, gross, and low-stock
lines. — recommended.** Reuses `isAwaitingHandover`, which already claims to
drive a dashboard count that does not exist (`order-status.ts:96`).
*Defense:* during a drop the founder's three questions are "did it sell", "what
do I owe people", and "what's left" — currently three screens and an accordion
each. *Counter:* gross-sales arithmetic in the admin is a second source of truth
next to Stripe; it must be labelled as an in-house tally, not accounting.

**B. Counts only** (awaiting + low stock), no money. Avoids the second-source
problem entirely.

**C. Fix the TSDoc instead** and keep the dashboard as it is.

### O-D — Refunds and cancels

**A. Keep Stripe-only, add a deep link. — recommended.** The payment intent id
is already on the card (`order-card.tsx:134`); make it a link to the Stripe
dashboard, and add an admin-side `canceled` transition for `pending` orders that
never got paid. *Defense:* `order-status.ts:39` is right — a status set here
would claim a refund that never left the account. A link is navigation, not
money. *Counter:* the founder still leaves the admin to do a refund.

**B. Refund button in the admin** (calls Stripe, writes `refunded` only on
success). Convenient; puts an irreversible money action one tap from a phone
list, and the review already found one oversold-refund defect on this path.

**C. Neither.** Status quo.

### O-E — Abandoned pending orders

**A. Filter + manual cancel. — recommended.** Default the orders list to
"needs you", let `pending` be shown on demand, and allow cancelling one.
**B. Scheduled sweeper** (Vercel cron ages out `pending` past N hours).
Correct long-term; a cron that writes to `orders` unattended is new risk on the
money table. **C. Nothing** — accept that the list fills with junk after a hyped
drop.

### O-F — Founder-editable storefront copy

**A. Two fields, ticker + coming-soon line, stored in `site_settings`.**
*Defense:* removes a deploy from a copy change, and the founder owes a ticker
ruling right now (P2 deviation). *Counter:* the copy is the design; an
unconstrained field lets a 200-character ticker break the marquee. Mitigation:
length caps.
**B. Leave copy in code — recommended for now.** It changes ~once per drop and
the founder does not deploy; the flag-to-founder loop already exists.

### O-G — Things recommended **against**, recorded so they are not re-proposed

- **Admin audit log.** Two admins, one of whom wrote the code. Revisit at >2.
- **Founder-editable allowlist.** `ADMIN_EMAILS` + a deploy is correct at this
  size; a self-service allowlist is a privilege-escalation surface for no gain.
- **Order search / pagination.** The caps (100 / 200) are above the plausible
  first-drop volume. Revisit with real numbers after drop one.
- **A separate `/admin/orders/[id]` route.** The accordion was a deliberate
  phone-first call (`order-card.tsx:15`).

---

## 4. Dials (defaults proposed, none ratified)

| Dial | Proposed default | Note |
|---|---|---|
| `lowStockThreshold` | 3 | at or below, the dashboard says so |
| `pendingOrderStaleHours` | 24 | age at which a `pending` is offered for cancel |
| `adminPreviewBannerCopy` | — | founder's words; 2–3 variations at design time |
| `orderListLimit` | 100 (today's constant) | promote `orders.ts:82` into the registry if the list grows a filter |
| `subscriberListLimit` | 200 (today's constant) | same, `subscribers.ts:14` |
| `announcementConfirmPhrase` | `SEND` | typed to arm the one irreversible button |

---

## 5. Hazards this work walks into

- **The mode gate is the fail-closed heart of the app** (`lib/site-mode.ts:3`).
  O-B edits it. Any bypass must be additive, guard-derived, and pinned by a test
  that proves an anonymous request still gets `coming_soon`.
- **The live DB is shared with production.** Every verification window here is
  visible to real visitors — the reason O-B exists.
- **The P3 migration is not applied** (verified 2026-08-22). Any new admin read
  that touches `expected_amount_cents`, `stripe_events`, or
  `apply_checkout_completion` will fail against the live schema until it is.
  Keep new selects on foundation columns, as `orders.ts:16` already does.
- **The announcement is irreversible and legally regulated.** CAN-SPAM needs the
  postal address, which nobody has supplied yet; `List-Unsubscribe` and the
  in-body link are already handled by the action and template.
- **Copy rule.** Every new user-facing string that the founder's mockups do not
  already decide gets 2–3 real variations in different registers, asked in chat,
  never picked silently.
- **`ADMIN_EMAILS` in Preview** means every preview deployment has a live admin
  against the production database. Worth a look at whether Preview should hold
  it at all.
- **Next 16:** the file convention is `proxy.ts`, not `middleware.ts`
  (`proxy.ts:5`), and route handlers are not covered by the `(guarded)` layout —
  each one re-runs the guard itself (`subscribers/export/route.ts:14`).

---

## 6. Open questions → GATE 1

1. **Sequencing.** Does P4 close first (walkthrough + docs + `RUNTIME-PASS.md`),
   or does this project fold into it as one run?
2. **Which of O-A … O-F are in**, and in what order?
3. **O-D:** Stripe deep link only, or a refund button in the admin?
4. **O-E:** manual cancel, cron sweeper, or nothing?
5. Anything above the founder has already ruled on that this audit missed.

---

## 7. GATE 1 — answers given 2026-08-22

Asked in chat as one batch. Zach answered three of four and **stopped the run**
at the sequencing question. Recorded here as answers, **not** ratified `D`
decisions: Stage 3 was not entered, `SCOPE.md` was not renamed, and no plan
exists. Anyone resuming starts by re-verifying §1 — these facts age.

| Question | Answer |
|---|---|
| Sequencing (P4 close-out vs. this project) | **Unanswered — "stop here".** The one open question, and the one everything else waits on |
| Which capabilities are in (§3) | **O-A** announcement composer, **O-B** signed-admin preview of the live site, **O-C** drop dashboard, **O-F** editable ticker + coming-soon copy. All four in; only O-G's four items stay out |
| Refunds (O-D) | **A — Stripe deep link only**, plus an admin-side cancel for unpaid `pending` orders. `order-status.ts:39`'s reasoning stands: no status here claims money that never moved |
| Abandoned pendings (O-E) | **A — filter + manual cancel.** No unattended cron writing to `orders` |

O-F was taken against this doc's own recommendation (§3 O-F B). The
recommendation is not evidence and does not survive the answer; what does carry
forward is the constraint behind it — the ticker is a marquee, so the field
needs a length cap, and the copy itself is the founder's to write.

**Owed before any build starts:** the sequencing answer, and — whichever way it
goes — P4's close-out debt from §1.2, which no option in §3 covers.

---

## 8. Addendum 2026-08-22 — sequencing answered, O-C deepened

Written the same day as §7, after the founder asked for "KPIs on the admin
dashboard" — which is §3 O-C, already answered **in** at GATE 1. This addendum
does not re-open it. It re-verifies §1 (those facts had aged by hours, and two
were wrong), answers the held sequencing question, and does for O-C what §3
compressed into one sentence.

Still Stage 2. Nothing here is a ratified `D`. Status: **SCOPING**.

### 8.1 Facts that supersede §1 (re-verified 2026-08-22, `rpiitnwalifrsuwreylw`)

| §1 claim | Now | Citation |
|---|---|---|
| mode `coming_soon`, `drop_at` null | **`live`**, flipped 16:49Z; `drop_at` 2026-08-23 16:49Z. `mode = live` wins outright over a future timestamp, so the storefront is public now | live query; `lib/site-mode.ts:22` |
| P3 migration not applied | **Still not applied.** `stripe_events`, `apply_checkout_completion`, `orders.expected_amount_cents` all absent | live query |
| §1.2 names the migration as the only reason the orders walkthrough cannot be proven | **There are two.** Stripe is configured in *no* environment — neither Vercel Production nor `.env.local` holds `STRIPE_SECRET_KEY` or `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Both are `.optional()` by design | `vercel env ls production`; `lib/env/server.ts:20`, `lib/env/client.ts:12` |
| 0 orders, 4 products / 17 variants, 3 subscribers | unchanged; **204 units in stock** | live query |

**Live behaviour, stated precisely — this is not an outage.** Reason 2 fires
first and gracefully: `getStripe()` returns `null` (`lib/stripe.ts:19`), the
action short-circuits to `stripe-unconfigured` **before** touching the database
(`create-checkout-session.ts:66-73`), and the product page renders
**"ORDERS OPEN SOON"** (`order-copy.ts:26`) with the size row intact. A missing
publishable key reaches the same state client-side without a round trip
(`checkout-form.tsx:104`). Nothing is broken for a visitor; nothing corrupt can
be written.

**The ordering hazard that follows.** The missing Stripe key is *masking* the
missing migration. The moment a key is added, the action gets past the gate and
hits `insert({ expected_amount_cents })` (`create-checkout-session.ts:113`)
against a table without that column; the webhook behind it calls an RPC that
does not exist (`app/api/stripe/webhook/route.ts:87`). **Apply the migration
before the keys**, or the first Stripe test purchase proves a schema error
instead of the money path.

### 8.2 The held sequencing question (§6 Q1, §7) — answered

**P4 closes first.** Its close-out debt — §1.2 here, itemised in
`foundation/p4-handoff.md` §1 — runs to completion before any capability in §3
is built. This project stays at Stage 2 until then.

Answer given by Zach in chat 2026-08-22. Recorded as an answer, **not** a
ratified `D`: Stage 3 was not entered and this file is not renamed.

### 8.3 O-C deepened — which numbers, and what they cost

Foundation columns only. `orders.ts:16-20` sets the rule and this keeps it:
**nothing below selects a P3 column**, so the dashboard works against the live
schema as it stands and keeps working after the migration lands.

**Tier 1 — buildable today, no migration, no new dependency**

| KPI | Source | Note |
|---|---|---|
| Awaiting handover | `orders` where `status = 'paid'` | already computed, `orders.ts:100-103`; the count `order-status.ts:96` promises and does not render |
| Unpaid / stale pending | `orders` where `status = 'pending'` | feeds O-E's filter |
| Units sold | `sum(order_items.quantity)` over counted orders | see trap 1 |
| Gross | `sum(orders.amount_total_cents)` over counted orders | Stripe's actual charge; **includes shipping** (`dials.shippingFlatRateCents`), so it is not product revenue |
| Low-stock lines | `product_variants.inventory_count <= threshold` | **needs no orders — provable today** |
| Units left | `sum(product_variants.inventory_count)` | 204 now |
| Mailable subscribers | `subscribers` where `unsubscribed_at is null` | see 8.4 |

**Tier 2 — needs the P3 migration.** Quoted-vs-charged reconciliation
(`expected_amount_cents`), confirmation-email rate (`confirmation_sent_at`),
webhook health (`stripe_events`). Useful, unavailable, and not what was asked
for.

**Tier 3 — needs something the project does not have**

| KPI | What it would take |
|---|---|
| Visitors, sessions, conversion rate | An analytics package; none installed (`package.json`). New dependency, new vendor, a consent question, and §2's exclusion re-opened |
| Funnel / add-to-cart | There is no cart (BD-4) |
| **Sell-through %** | **Unreconstructable.** `inventory_count` is mutated in place and nothing records the starting count, so "sold 9 of 12" cannot be derived after the fact. Recording a starting count is a migration and a decision, not a dashboard |
| Revenue over time | Derivable from `created_at`; one drop of points is decoration, not a chart |
| Repeat customers | No accounts; email-matching only, and one drop makes the answer 0 |

### 8.4 An accuracy bug in the one KPI that already ships

The dashboard renders `subscribers.total`, which counts unsubscribed rows.
`getSubscriberList` already returns `active` beside it (`subscribers.ts:19-24`)
and nothing uses it — so the number the founder would plan a send around is
wrong by exactly the unsubscribes. One line, in a tile P4's walkthrough has to
look at anyway.

### 8.5 The two traps — both silent, both owed a test

BD-5 tests where failure is silent. These are that.

**Trap 1 — which statuses count as sold.** The obvious filter is
`status = 'paid'`. It is wrong: the moment the founder marks an order
`picked_up` or `fulfilled` it leaves the set, so **gross falls as he works his
queue.** Counted: `paid | fulfilled | picked_up`. Out: `refunded`, `canceled`,
and `pending` (that money never moved). Proposal: a pure `countsAsSold(status)`
beside `isAwaitingHandover` in `order-status.ts`, vitest over all six statuses
— same shape and same reasoning as `allowedTransitions`.

**Trap 2 — reusing the orders list.** `getOrderList` caps at 100
(`orders.ts:82`). Summing its rows is correct until order 101, then
permanently and invisibly low. The KPI read must be its own uncapped query.

### 8.6 Read strategy

Constraint: **there is no local Supabase CLI and no Docker on this machine, so
every migration is hand-applied in Studio's SQL editor** (P1 did exactly this,
`PLAN.md` §P1), and one migration is already queued unapplied. That argues for
a design needing **no migration at all**.

- **A (recommended).** `features/admin/lib/kpis.ts` doing a few targeted
  service-role reads: `head: true` counts for the status buckets, one uncapped
  select of `amount_total_cents` + `status` for the sum, one variant read for
  stock. Trivial at this scale, needs nothing in the database, and keeps the
  arithmetic where vitest can pin 8.5.
- **B.** A view or `sum()` RPC. Correct at volume; one more hand-applied
  migration, and the arithmetic moves where vitest cannot see it.
- **C.** Reuse `getOrderList`. Cheapest, wrong at order 101.

### 8.7 Form, and the copy owed at GATE

Numbers, not charts. Phone-first, in the tile idiom the dashboard already uses
— Anton numerals over an Archivo label, `border-2 border-current`
(`admin-dashboard-screen.tsx:22-30`). Tokens only, no raw hex.

**A failed read renders `—`, never `0`.** `orders.ts:90` sets the precedent
("`null` means the read failed -- never an empty list, which reads as 'no
sales'"). A KPI row is where defaulting to zero is most tempting and lies
loudest.

Labels are user-facing strings no mockup decides, so the copy rule applies —
2–3 variations per label, asked, never picked silently:

| Tile | Terse | Plain | Founder's register |
|---|---|---|---|
| paid, not handed over | `TO HAND OVER` | `WAITING ON YOU` | `YOU OWE` |
| units sold | `SOLD` | `PIECES SOLD` | `OUT THE DOOR` |
| gross | `GROSS` | `MONEY IN` | `TOOK IN` |
| low stock | `LOW` | `RUNNING LOW` | `ALMOST GONE` |
| the gross qualifier | `IN-HOUSE TALLY` | `OUR COUNT — STRIPE IS THE BOOK` | `ROUGH — CHECK STRIPE` |

The qualifier is not optional: §3 O-C A's own counter is that a gross figure
here is a second source of truth next to Stripe.

### 8.8 Additions to §4 (dials) and §5 (hazards)

**Dial:** `lowStockThreshold`, proposed default **3** — at or below, the
dashboard says so. (Already proposed in §4; restated because O-C is the thing
that consumes it.)

`countsAsSold` is deliberately **not** a dial. It is correctness, not a
tunable, and belongs in tested code (8.5).

**Hazards, added to §5:**

- **Apply the P3 migration before any Stripe key lands** (8.1). Ordering, not
  urgency.
- **The 100-row list cap** silently corrupts any total built on it (8.5).
- **Statuses for gross** — a naive `= 'paid'` makes the number fall as the
  founder works (8.5).
- **This feature cannot earn a Stage 7 entry** until one test purchase
  completes. It can be unit-tested; it cannot be seen working. P4 is already
  stalled on an unrun walkthrough — this would be the second phase closing on
  unproven code.

### 8.9 Open questions carried to GATE

§6's list, minus what §7 and 8.2 answered, plus what O-C's detail raised:

1. **Which reading of "KPIs" did the founder mean** — Tier 1 sales-and-ops
   (what O-C answered; small, buildable) or Tier 3 traffic-and-conversion (new
   vendor, and §2's exclusion re-opened)? Deferred to the founder; the question
   drafted for him is 8.10.
2. **What is the single number he wants first?** O-C A named four and ranked
   none. That answer decides the layout.
3. **Copy** — one column of 8.7 per tile.
4. **Time window** — all-time, or scoped to a drop? All-time recommended;
   drop-scoping needs a drop entity that does not exist.

Not re-asked: whether money appears at all (GATE 1 took O-C A), and O-D/O-E
(answered in §7).

### 8.10 The question drafted for the founder

Plain language, no schema words; offers the two readings as things he can
picture rather than asking him to pick a tier.

> Working on the dashboard — the first screen you land on when you open the
> admin on your phone. Want to build it around the numbers you'll actually want
> during a drop, not the ones I'd guess at.
>
> Two different kinds of thing I could put there:
>
> **1. What's happening with the drop.** How many orders are waiting on you to
> hand something over or ship it, how many pieces have sold, how much money
> came in, and which sizes are running low or gone. All of it from real orders.
>
> **2. What's happening with the website.** How many people visited, how many
> got as far as the product page, and what share of visitors actually bought.
> That's a different kind of tracking — it needs another tool wired in, so it's
> worth knowing whether you care about it before I go there.
>
> Which of those do you actually want to look at? Both is a fine answer — just
> want to know which one matters more, because that's the one that gets the
> biggest number on the screen.
>
> And one more: when you glance at that screen mid-drop, what's the **single**
> thing you most want to know in the first second? That one gets the top spot.

### 8.11 Route from here (not a plan — Stage 4 writes that)

Per `~/Projects/ezhomesteading/docs/feature-lifecycle.md`:

| Step | Stage | Folder | Blocked on |
|---|---|---|---|
| ~~P4 close-out — walkthrough, `RUNTIME-PASS.md`, `PLAN.md` header, `DESIGN.md` `As built`~~ **DONE 2026-08-22** | ~~5 → 6 → 7~~ complete | `foundation/` | — closed on W1–W6; W7 (orders) still owed, blocked on the migration + Stripe keys |
| Founder's answer to 8.10 | GATE 1 remainder | — | Zach asking Lalo |
| `SCOPE.md` → `DESIGN.md`, `D1…Dn` written from §7 + 8.9 | 3 | this folder | both rows above |
| `PLAN.md` — phases, drivers, done-when, dials | 4 | this folder | Stage 3 |
| GATE 2 | — | — | Zach |
| Build, one phase per session | 5 | this folder | GATE 2 |

Two notes for whoever writes Stage 4. The lifecycle's gate commands and hazard
checklist are ezhomesteading's; this repo's gates are
`bun run lint && bunx tsc --noEmit && bun run build && bun run test`
(`CLAUDE.md`), there is no Go, no native, no parity script and no lint ratchet,
and migration numbers are timestamps rather than a `tail -1` sequence. And O-B
(the signed-admin preview) edits the fail-closed mode gate — by the lifecycle's
driver table that is the one candidate here for a narrow Fable review, since a
bug there compiles, passes every gate, and opens the store early.
