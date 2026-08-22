# Runtime pass — observed behaviour, per phase

Stage 7 of `~/Projects/ezhomesteading/docs/feature-lifecycle.md`. One entry per
proof, written **when it was run**, recording what was observed rather than what
the code should do. A green gate is not a runtime pass; the two claims never
merge.

**Provenance is marked on every entry.** `VERIFIED HERE` means this session
queried the live project or fetched production and saw the stated value.
`OBSERVED BY ZACH` means a human at the keyboard reported it and no independent
artifact exists — recorded as testimony, which is what a phone walkthrough
produces. Where a DB reading corroborates testimony, both are given.

## Phases with no entries

**P1 and P2 have none, and none will be written retroactively.** Both phases
were proven — P1's proofs are in `PLAN.md` §P1 (signup row, RLS 401s, the 49 s
mode flip) and P2's in §P2 (screenshots, the ~15 s sold-out window, the
`/_next/image` audit) — but they were recorded in phase headers before this file
existed. Reconstructing them here from those summaries would produce a document
that looks like observation and is actually transcription. The headers stand as
the record for those phases.

---

# P3 — Checkout & orders (money path)

**Opened 2026-08-22 against commit `fad6f16`, Supabase project
`rpiitnwalifrsuwreylw`, production `www.swampmagazine.com`.** Written in two
sittings on the same day: first with all four proofs recorded as NOT RUN and
their blockers verified, then updated in place as the blockers cleared and R1
actually ran. The NOT RUN text for R2–R4 is not leftover — it is current.

**The blockers named in the morning are discharged.** Both were human-keyed and
both were done by Zach this session:

| Blocker | Morning state | Now |
|---|---|---|
| P3 migration on the live DB | not applied | **APPLIED.** `stripe_events` and `apply_checkout_completion` exist; `orders` carries `expected_amount_cents` and `confirmation_sent_at`. Grants verified on the live project: `has_function_privilege` is **false for `anon`**, true for `service_role` — the `REVOKE` took, so the RPC that marks orders paid is not an anon-callable PostgREST endpoint |
| Stripe keys | absent everywhere | present in `.env.local` and Vercel Production |

**A third blocker surfaced that no document predicted, and it cost the live
site.** Stripe's two keys are independently `.optional()` at boot, so an
environment can hold one without the other. Vercel was given
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_WEBHOOK_SECRET` but **not
`STRIPE_SECRET_KEY`**, which put production in a state the design never
contemplated: the client had a key, so it rendered the real form with a live
SUBMIT button, and the server had none, so `createCheckoutSession` refused every
press with `stripe-unconfigured`. The graceful branch was built for "no Stripe at
all", not "half of Stripe", and half of Stripe reads to a buyer as a dead button.
Found by Zach hitting it on the live site, diagnosed from `vercel env ls`, fixed
by adding the key and redeploying. **This wants a guard** — the two keys should
be asserted present together, or absent together, rather than each being
independently optional.

The database is shared with production, and unlike every prior phase, the site
was **`live` and public** throughout this pass.

---

## R1 — A test-card purchase decrements exactly 1 — **PASS**

*OBSERVED BY ZACH (he made the purchase, on production); every figure below
VERIFIED HERE by live query.* This is the first proof in the project where the
money path moved real state.

Order `5bb64175-77b1-40fb-905e-058a2b03da6c`, created 21:22:49Z, settled
21:23:26Z — 37 seconds, buyer-paced:

| Check | Reading |
|---|---|
| status | `paid` |
| line items | College Arch XS ×1, pickup |
| `amount_total_cents` vs `expected_amount_cents` | **2500 vs 2500** |
| `stripe_events.amount_mismatch` | `false` |
| `stripe_events` rows for the order | **exactly 1**, outcome `applied` |
| College Arch XS inventory | **12 → 11** |
| buyer identity | captured by Stripe (`Zachary Short`, `shortzach396@gmail.com`) — the action never collects it |

**Four things this proves that no test could.** The migration's new columns work
against the live schema (`expected_amount_cents` was written at creation on the
very first order). The quoted price and the charged price agree, and the
mismatch flag that exists only to make that checkable read false. The RPC
committed `paid` and the decrement together. And the decrement was **one**.

**A control fell out of it for free.** Two abandoned `pending` orders exist —
`10903893…` (Star Shorts S, mine at 21:13) and `a90e677c…` (College Arch XS,
21:18) — and star-shorts S still reads 12. So `pending` demonstrably does not
decrement; only the paid transition does. That was assumed, and is now observed.

Those two rows are also the first real instances of the abandoned-pending
problem `admin-completion` §3 O-E was written for. They are not cleanup debt to
hide — leave them as the fixture that feature will be built against.

## R2 — A replayed webhook event does not decrement again — **NOT RUN (newly diagnosed blocker)**

Not blocked by what `PLAN.md` predicted. The keys are in place and the money
path works; the blocker is that **the Stripe CLI is authenticated to the wrong
Stripe account.**

| | Account | Evidence |
|---|---|---|
| Stripe CLI / `stripe listen` | `acct_1TttU6HtlsVEnwYu` "New business sandbox" | `stripe config --list` |
| `STRIPE_SECRET_KEY` in `.env.local` | `acct_1U7LkQJw1iJWNigh` **"SWAMP MAGAZINE"** | `GET /v1/account` |
| Vercel Production | the SWAMP account | the paid order exists |

The purchase event id, `evt_1U7MNt**Jw1iJWNigh**xKTwU2AM`, carries the SWAMP
account id; `stripe events resend` answered `No such notification` because the
CLI was asking a different account. The only webhook endpoint the CLI can list
belongs to that other account and points at a Northflank backend.

**Consequences, all verified rather than supposed:**
1. `stripe listen` has been forwarding the *other* account's events to
   `localhost:3000/api/stripe/webhook` this whole time. Swamp events never
   arrived — corroborated by the dev server having logged nothing during a
   purchase that demonstrably succeeded on production.
2. The `whsec_` in `.env.local` is from that wrong account's listen session, so
   local signature verification cannot succeed against a real swamp event.
3. Production was never affected. Its keys and endpoint are correct.

**Unblock:** `stripe login` onto SWAMP MAGAZINE, take the fresh `whsec_` into
`.env.local`, then resend the event. Worth checking the swamp endpoint's pinned
API version at the same time — the other account's endpoint sits on
`2026-06-24.dahlia`, an older dahlia than the `2026-07-29.dahlia` the installed
SDK describes, and `collected_information.shipping_details` is the field that
silently goes null across that boundary.

**Partly answered anyway, by accident.** Exactly one `stripe_events` row exists
for an event Stripe delivers at least once and retried against a production
endpoint that was 500ing for part of the window. The primary-key guard held.
That is not the deliberate replay R2 asks for and is not recorded as one.

## R3 — A 0-stock size cannot create a session — **HALF PROVEN**

**The storefront half — VERIFIED HERE.** `/product/vamp-tee`, whose five sizes
all read `inventory_count = 0`, renders every size struck through with an
`sr-only` "sold out", and **renders no submit control at all** — a `<p>SOLD
OUT</p>` stands where SUBMIT would be. There is no client path to a sold-out
purchase. `/product/star-shorts` on the same load renders its three sizes
normally, so this is stock-driven, not a broken page.

**The server half — NOT RUN.** The guard in `createCheckoutSession` has not been
made to fire. Producing a request that claims a sold-out size needs either a
zero written into production inventory or a direct POST to the action by its id;
both were attempted this session and both were refused by tooling policy.
Nothing is claimed for it. The intended run is the real race: select a size,
zero it from `/admin/products`, submit, and watch the server refuse what the
client still believes is in stock — which also exercises the client's
`refusedSizes` recovery path.

Pinned meanwhile by vitest, which is a different kind of assurance.

## R4 — A pickup order's email says where to pick up — **NOT RUN**

Still blocked on the founder's copy, and R1 added evidence about the mechanism.

The paid order's `confirmation_sent_at` reads **null**. The webhook claims that
column *before* sending and releases it on failure, so null means either the
send failed and released, or the claim never ran. The buyer address was
`shortzach396@gmail.com`, and the Resend sandbox delivers only to the account
owner `zach.short@fantomworks.com`, which makes a failed-and-released send the
strong reading — the same 403 P1 recorded. **Marked as inference, not
observation:** the production log would settle it and this session could not
read it (the runtime-logs API returned 403 for this token).

Either way R4's substance is untouched: `emails/order-confirmation.tsx` still
promises a follow-up email rather than naming a pickup spot, because where and
when campus pickup happens is Lalo's to state. A green send of invented copy
would satisfy the mechanism and fail the proof.

---

## Other state observed

**`vamp-tee` is deliberately sold out.** All five sizes read
`inventory_count = 0`. Confirmed as intended by Zach 2026-08-22 in chat —
**this is not drift and must not be "restored."** Recorded because the P4
entries state 204 units and the next audit comparing the two would otherwise
file a regression. Total units now read **143**: 204 minus the 60 of vamp-tee,
minus the one College Arch XS that genuinely sold in R1.

**The site was live and public for this entire pass.** `site_settings.mode` read
`live` with `drop_at` null when this session began — flipped by Zach while
wiring the webhook, not by any agent — and stayed live throughout. Unlike P1
(49 s), P2 (~15 s) and P4 (~50 min), this was not a bounded verification window,
and for part of it the storefront presented an armed SUBMIT button that could not
transact (see the opening). Closing it is Zach's call and had not been made when
this was written.

**The embedded form's placement is now a live design question.** Seeing the real
Stripe form mounted on the product page, Zach flagged that he is "not crazy about
the form to purchase being directly in that page". This is `DESIGN.md` D2
territory, and worth knowing before it turns into a debate: **D2 already
pre-authorises the change.** O2-B, hosted Stripe Checkout by redirect, is the
recorded fallback "if the embedded flow fights us", and `PLAN.md` §P3's watch-for
makes switching to it a build-level call rather than a design amendment — it only
has to be recorded as an `As built:`. No ratification is needed, no gate has to
reopen. Logged here as an open question, not a decision.

**Two abandoned `pending` orders exist** and are deliberately not cleaned up.
See R1.

## Gates at this point

Re-run in full from this tree at commit `fad6f16`, in the corrected order
(`build` before `tsc`, per the note at the end of the P4 section):

```
bun run lint && bun run build && bunx tsc --noEmit && bun run test
```

**All green.** Lint 0 warnings; build ✓; tsc exit 0; vitest **99/99 across 15
files**. Unchanged from the P4 close-out run, as expected — the only commit since
was the BIMI vector mark.

**Stated once more because this section is where it matters most:** those gates
say the money path compiles and its model is consistent. They say nothing about
whether a card charges, a webhook verifies, or stock moves. P3 stays OPEN.

---

# P4 — Admin

**Run 2026-08-22 against commit `f44fd68`, Supabase project
`rpiitnwalifrsuwreylw`, production deploy `swamp-magazine.vercel.app`.**
Walkthrough shape and fixtures from `p4-handoff.md` §2. Six entries: W1–W6 pass,
W7 is blocked and did not run.

The database is shared with production. Every entry below that mutates a row was
visible to real visitors while it was mutated.

---

## W1 — Only an allowlisted address gets in — **PASS**

*OBSERVED BY ZACH, both cases.* Signed out, `/admin` redirects to
`/admin/sign-in`. A magic link sent to the address in `ADMIN_EMAILS` arrives and
lands on `/admin`. An address **not** in `ADMIN_EMAILS` is routed through
sign-out and never reaches the admin shell — a signed-in non-admin is still
nobody.

The negative case is the one that matters and it was actually exercised, not
inferred from the guard's source.

**Side effect worth recording:** this closes the standing "unverified — dashboard
state, not repo state" item on Supabase Auth. The magic link arriving at all
means the email provider is enabled *and* the Auth → URL Configuration →
Redirect URLs are set correctly. That was the flagged silent failure in
`mvp-parallel-handoff.md` §checklist 2 and it is no longer open.

## W2 — The mode toggle moves the public site — **PASS**

*OBSERVED BY ZACH; end state VERIFIED HERE.* GO LIVE flipped
`site_settings.mode` to `live` at **16:49Z**, and `/` became the storefront on
one reload with no redeploy.

Independent confirmation: `select mode from public.site_settings where id = 1`
reads `live`, and a fetch of `https://swamp-magazine.vercel.app/` returns the
live landing screen — hero, mascot and marquee — not the sign-up page.

**The reverse path was exercised too.** BACK TO COMING SOON was tapped at
**17:39:51Z**, and `site_settings` now reads `mode = coming_soon` with
`drop_at` null (VERIFIED HERE; the on-screen feedback "BACK TO COMING SOON. DROP
TIME CLEARED" was captured in a screenshot at 13:39 local, which is the same
instant). Both directions of the toggle are proven.

**Exposure window: 16:49Z → 17:39:51Z, about 50 minutes** — the interval the
storefront was public. Longer than P1's 49 s or P2's ~15 s, and deliberately so:
the intent at the time was to leave the site live, and it was reverted later in
the same session. What a visitor saw during it was the full storefront with
**"ORDERS OPEN SOON"** on every product page, because Stripe is configured in no
environment — the graceful branch in `admin-completion/SCOPE.md` §8.1, not an
outage. Nothing could be bought and nothing corrupt could be written.

## W3 — A drop time arms and reads back in local time — **PASS, one sub-case unexercised**

*OBSERVED BY ZACH; end state VERIFIED HERE.* DROP TIME set and armed; the field
re-renders the same wall-clock time typed, not a UTC-shifted one.

While armed, `drop_at` read **`2026-08-23 16:49:00+00`** — a future timestamp,
stored correctly as UTC from the local wall clock typed in.

**Cleared and restored.** `drop_at` is now null (VERIFIED HERE, cleared at
17:39:51Z alongside the mode flip). The admin reported it in the same breath as
the mode change — "BACK TO COMING SOON. DROP TIME CLEARED" — which is the
documented behaviour of closing the shop while a countdown is set. Fixture state
matches the handoff's requested end state.

**Unexercised:** the past-timestamp sub-case — a `drop_at` set in the *past*
opening the store while the row still says `coming_soon`. The timestamp used was
a future one, so this path never ran. Not claimed. It is pinned by a vitest case
on `resolveSiteMode`, which is a different kind of assurance than seeing it.

## W4 — Swapping an image changes the live page — **PASS — VERIFIED HERE, independently**

P4's headline proof, and the one entry that needed no testimony.

Two slots were written through the admin upload path today, **after** the
production deploy:

| Slot | `storage_path` | Written | Served size |
|---|---|---|---|
| `landing_mascot` | `landing_mascot-1938a36e.webp` | 14:39:17Z | 57 KB |
| `landing_hero` | `landing_hero-67086760.webp` | 16:37:53Z | 20 KB |

Four independent things follow, none of which rest on anyone's report:

1. **The upload path ran.** Both paths carry the versioned
   `<slot_key>-<hash>.webp` shape that `actions/admin-image-slots.ts` mints. The
   five seed slots have a visibly different shape (`star-shorts/cutout.webp`,
   `product_bg-star-shorts.webp`), so these were not seeded.
2. **The resize ran.** A 3–5 MB phone master came back as a **20 KB** WebP. The
   served object is not the original.
3. **No redeploy was involved.** Commit `f44fd68` was committed 14:09:47Z and is
   what production runs. Both slots were written after that — 30 min and 2½ h
   later — and production serves them now. Content changed without a deploy,
   which is the whole claim.
4. **The storefront actually consumes them.** Fetching production, every hero and
   mascot `src` resolves through `/_next/image?url=…%2Flanding_hero-67086760.webp`
   — through the optimizer, not a raw storage URL, so P2's image discipline
   survived the swap.

The counter moved **5/10 → 7/10**, not the 5→6 the handoff predicted, because
the mascot was uploaded as well as the hero.

**This also closes a P2 deviation.** P2 recorded the landing hero falling back to
the star-shorts lifestyle shot and the goblin mascot missing entirely, both
"await founder uploads (P4)". Both are now real. The fallback path is no longer
what production renders.

## W5 — Stock and price edits reach the storefront — **PASS**

*OBSERVED BY ZACH; restore VERIFIED HERE.* A size was zeroed in
`/admin/products`, and that size then rendered sold-out on the product page —
dimmed and struck through — while the other sizes did not. The count was
restored afterward.

Corroboration, and its limit: all 17 variants currently read `inventory_count =
12` (204 units total), which is consistent with the restore having happened. It
is **not** independent proof the edit occurred — a never-run walkthrough leaves
the identical reading. The edit-and-observe half is Zach's testimony; the DB only
confirms nothing was left zeroed.

## W6 — The subscriber list and CSV are real — **PASS, one sub-case unexercisable**

*OBSERVED BY ZACH; count VERIFIED HERE.* The subscriber count on screen matched
the database, and EXPORT CSV downloaded a file that opened as a spreadsheet on
the phone.

`select count(*) from public.subscribers` reads **3**, matching what was seen. A
screenshot of the phone taken during the pass shows the browser's own
"Download complete — `swamp-subscribers-2026-08-22.csv`" toast, so the export
reaching the device is corroborated by an artifact, not only by report.

**Unexercisable with today's data:** "an unsubscribed row reads as unsubscribed
rather than vanishing." All 3 subscribers are active — `unsubscribed_at is not
null` returns **0 rows** — so no unsubscribed row existed to render either way.
Not a failure; there was nothing to look at. It needs one row through
`/unsubscribe` before it can be claimed.

**A latent bug this entry walked past without tripping:** the dashboard renders
`subscribers.total`, which counts unsubscribed rows, where it should render the
`active` figure `getSubscriberList` already returns
(`features/admin/lib/subscribers.ts:19-24`, written up in
`admin-completion/SCOPE.md` §8.4). Today `total` and `active` are both 3, so the
wrong number is accidentally right and the walkthrough could not have caught it.
It becomes wrong the first time anyone unsubscribes.

## W7 — Mark an order picked up — **NOT RUN (blocked)**

Recorded as not run. No proof is claimed and P4 does not close this item.

Blocked on two independent things, both human-keyed, both verified absent today:

1. **The P3 money-path migration is not applied.** `stripe_events`,
   `apply_checkout_completion` and `orders.expected_amount_cents` are all still
   absent from the live schema (VERIFIED HERE).
2. **Stripe is configured in no environment** — neither `.env.local` nor Vercel
   Production holds `STRIPE_SECRET_KEY` or
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

There are 0 orders and no way to create one, so there is nothing to mark. The
orders screen itself renders — `features/admin/lib/orders.ts:16` selects only
foundation columns, so it works against the un-applied migration and simply shows
an empty queue.

**Ordering hazard, restated because this is where someone will start.** Reason 2
currently masks reason 1: `getStripe()` returns `null` and the action
short-circuits before touching the database. Add a Stripe key first and the
action gets past that gate into an insert against a column that does not exist.
**Apply the migration before the keys**, or the first test purchase proves a
schema error instead of the money path.

---

## Defects the pass found

This is what a runtime pass is for — neither of these is visible to a gate, and
neither was caught by 99 passing tests.

**D1 — The DROP TIME field overflowed its container on iOS. FIXED.**
Caught in a screenshot during W3: the `datetime-local` input spilled past the
right edge of the panel and past the SET / CLEAR buttons beneath it, which are
the same nominal width. Cause: iOS gives `datetime-local` an intrinsic width
wider than the column, and a flex item's default `min-width: auto` lets that
intrinsic size beat `w-full`. Fixed with `min-w-0` on the input, plus `px-4` to
match `buttonClasses` so the field and the two buttons stack to one edge
(`features/admin/components/site-mode-controls/site-mode-controls.tsx:161`).
Desktop never showed it — the founder's phone is the only place it appears,
which is the entire argument for a phone-shaped walkthrough.

**D2 — The dashboard's subscriber figure counts unsubscribed rows. NOT FIXED
(out of P4 scope).** Written up under W6 and in `admin-completion/SCOPE.md`
§8.4. Today `total` and `active` are both 3, so the wrong number is accidentally
right; it goes wrong at the first unsubscribe.

## Other state observed during the pass

**The production domain is live.** The walkthrough was run against
`swampmagazine.com`, not `swamp-magazine.vercel.app`; the apex redirects to
`www.swampmagazine.com` and serves 200. DNS is pointed. This is a **P5** cutover
item (`PLAN.md` §P5.5) that has evidently happened early — recorded here as an
observation, not a claim that P5's cutover is complete. The rest of that item is
untouched: Resend domain verification, Vercel Pro before the first real sale, and
Stripe live keys are all still owed, and P5 has not been entered.

## Gates at this pass

Re-run from a cold `.next` at close-out, not taken from the commit message:

```
bun run lint && bun run build && bunx tsc --noEmit && bun run test
```

**All green.** Lint 0 warnings; build 21 routes with `ƒ Proxy (Middleware)`
present; tsc exit 0; vitest **99/99 across 15 files**.

**Gate order matters here and the documented order is wrong for a cold tree.**
`CLAUDE.md` gives `lint && tsc && build && test`. Run that after `rm -rf .next`
and tsc fails with `Cannot find name 'PageProps'` / `'LayoutProps'` in
`app/layout.tsx` and `app/product/[slug]/page.tsx` — Next only generates the
route-type tree during `next build`, so tsc has nothing to resolve against. It is
not a code defect; it happened on this run and cost a full rebuild. **Put `build`
before `tsc`** when the tree is cold. Already flagged in
`mvp-parallel-handoff.md` §"Lane E — as built"; repeated here because the gate
line in `CLAUDE.md` still reads the other way.

21 routes, up from the 18 claimed at commit `f44fd68`, because the uncommitted
brand work in the tree adds `/icon.png`, `/apple-icon.png` and
`/manifest.webmanifest`.
