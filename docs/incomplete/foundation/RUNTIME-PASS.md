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
