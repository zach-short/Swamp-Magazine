# P4 handoff — close-out owed

**Written 2026-08-22, after the admin audit in
`docs/incomplete/admin-completion/SCOPE.md`. Status: ~~P4 is CODE-COMPLETE and
NOT CLOSED~~ → **DISCHARGED 2026-08-22. P4 is CLOSED on W1–W6; W7 is owed.**
Same shape as `p2-handoff.md`. It stands alone — the next agent will not have
seen the audit conversation.

**This document's work is done. Do not re-run it.** All four close-out items in
§1 are complete: the walkthrough was run by Zach, `RUNTIME-PASS.md` now exists
with W1–W6 recorded per-entry (and W7 recorded as not run),
`PLAN.md` §P4 carries its `BUILT` header, and `DESIGN.md` has its
`## As built (P4, 2026-08-22)` section. Gates were re-run green from a cold
`.next` at close — see the P4 header for the numbers and the gate-order warning.

**What is still owed from P4, and only this:** W7 — mark an order picked up.
Blocked on §3's two human-keyed items, both re-verified absent at close. §2's
walkthrough text below is kept as the historical spec; its fixtures have aged
(`landing_hero` is now registered, mode is `live`), so read §2 for shape and
`RUNTIME-PASS.md` for what actually happened.

The next step is `admin-completion` Stage 3 per §8.2 and §8.11 of that doc —
gated on the founder's answer to its §8.10.

---

## 0. Where things stand (verified 2026-08-22)

| Claim | Verified state | Citation |
|---|---|---|
| HEAD | `f44fd68` "P4: products, images and orders admin screens" | `git log` |
| Working tree | Clean except untracked `docs/incomplete/admin-completion/` | `git status --porcelain` |
| P4's six scope items | All built — guard, mode toggle + `drop_at`, product/variant CRUD, image slots, subscribers + CSV, orders queue | audit §1.1, `SCOPE.md` |
| Gates at the P4 commit | lint 0 warnings, tsc clean, build 18 routes, vitest 99/99 — **claimed in the commit message, not re-run since** | `git show f44fd68` |
| P4 "Done when" | **Not run.** The founder-shaped phone walkthrough | `PLAN.md` §P4 |
| `ADMIN_EMAILS` | Set in `.env.local` **and** in Vercel Production + Preview | `vercel env ls production`, 2026-08-22 |
| Supabase Auth email provider + Redirect URLs | **Unverified** — dashboard state, not repo state. Without Redirect URLs the magic-link callback silently never fires | `mvp-parallel-handoff.md` §checklist 2 |
| P3 money-path migration on the live DB | **NOT APPLIED.** `stripe_events`, `apply_checkout_completion` and `orders.expected_amount_cents` all absent | live query, project `rpiitnwalifrsuwreylw` |
| Live data | 4 products (all active), 17 variants, 3 subscribers, **0 orders**, 5 of 10 image slots registered, mode `coming_soon`, `drop_at` null | same query |
| `RUNTIME-PASS.md` | **Does not exist** for this project | `ls docs/incomplete/foundation/` |

### Two facts in the table above went stale within hours

Re-verified 2026-08-22 in `admin-completion/SCOPE.md` §8.1 — read that before
trusting this table:

- **Mode is now `live`**, not `coming_soon` (flipped 16:49Z; `drop_at`
  2026-08-23 16:49Z, which `mode = live` overrides outright,
  `lib/site-mode.ts:22`). The storefront is public. This changes step 2 of the
  walkthrough below and means any mode flip during it is visible to real
  visitors.
- **Stripe is configured in no environment** — not Vercel Production, not
  `.env.local`. The unapplied migration is therefore *not* the only reason the
  orders walkthrough cannot be proven; it is the second of two. The storefront
  renders "ORDERS OPEN SOON" gracefully (`order-copy.ts:26`), so this is a gap,
  not an outage. **Apply the migration before adding any Stripe key**, or the
  first test purchase fails on a missing column instead of proving the money
  path.

The database is **shared with production**. Anything flipped here is visible to
real visitors for as long as it is flipped. That is the whole reason
`admin-completion` §3 O-B exists.

---

## 1. Scope of the close-out

1. **Run the walkthrough** — §2 below, as a founder would: signed in on a
   phone-width viewport, not a desktop admin panel.
2. **Create `docs/incomplete/foundation/RUNTIME-PASS.md`** and put §2's entries
   in it. It is owed for P1 and P2 as well; write P4's and note the older
   phases' absence rather than reconstructing them from memory — Stage 7 is
   explicit that reconstructed passes are the failure mode, not the fix.
3. **`PLAN.md` §P4 header** → `**BUILT <date>, commit `<hash>`**` plus the
   deviations, in the shape P1 and P2 already use in that file.
4. **`DESIGN.md`** → an `## As built (P4, <date>)` section. At minimum record:
   storage writes go through the service role behind the admin guard rather
   than allowlist-scoped bucket policies (strictly tighter than the P4
   watch-for asked for, since a signed-in non-admin has no path at all); orders
   are an accordion, not an `/admin/orders/[id]` route; and `sharp` moved to
   `dependencies` because it now runs at request time.
5. ~~Answer, or re-ask, the held sequencing question.~~ **Answered
   2026-08-22** (`admin-completion/SCOPE.md` §8.2): P4 closes first, then
   `admin-completion`. Nothing to ask — just finish 1–4.

**Not in scope:** anything from `admin-completion` §3. Those four capabilities
are answered but unplanned; building one here would skip Stages 3–4.

---

## 2. The walkthrough, as runtime-pass entries

Five of the six items are provable today. The sixth is blocked — §3.

Fixtures are given as SQL, never as ids.

**W1 — Only an allowlisted address gets in.**
*Where:* `/admin` signed out, on a phone.
*Right answer:* redirected to `/admin/sign-in`. A magic link to the address in
`ADMIN_EMAILS` lands on `/admin`. An address **not** in `ADMIN_EMAILS` is
routed through sign-out and does not reach the shell — a signed-in non-admin is
still nobody. If the link never arrives, the cause is almost always Supabase
Auth → URL Configuration → Redirect URLs, not the code.

**W2 — The mode toggle moves the public site.**
*Where:* `/admin` → GO LIVE, then load `/` in a **different, signed-out**
browser.
*Right answer:* `/` flips from the sign-up page to the storefront on one
reload, with no redeploy. BACK TO COMING SOON takes two taps and reverses it.
**Keep this window short and restore `coming_soon` — the DB is production.**

**W3 — A drop time arms and reads back in local time.**
*Where:* `/admin` → DROP TIME → set a time an hour out → SET.
*Right answer:* the field re-renders the same wall-clock time the founder
typed, not a UTC-shifted one. Setting a time in the **past** opens the store
even while the row says `coming_soon`; BACK TO COMING SOON then clears it and
says so. Restore to `drop_at` null.
*Fixture:* `select mode, drop_at from public.site_settings where id = 1;`

**W4 — Swapping an image changes the live page.** *P4's headline proof.*
*Where:* `/admin/slots` → LANDING HERO → pick a phone photo → replace.
*Right answer:* the screen shows the new picture, and `/` shows it on the next
load without a redeploy. The counter moves 5/10 → 6/10.
*Fixture:* `landing_hero` is currently **unregistered** — verify with
`select slot_key from public.image_slots order by slot_key;` (expect four
`product_cutout:*` and one `product_bg:star-shorts`). So this upload is also
the fix for P2's recorded deviation, where the landing hero falls back to the
star-shorts lifestyle shot. A 3–5 MB phone master is the right input: it must
come back as a resized WebP, and the served file must not be the original.

**W5 — Stock and price edits reach the storefront.**
*Where:* `/admin/products` → open a product → zero one size → save. Then the
product page in live mode.
*Right answer:* that size renders sold-out (dimmed, struck through, with a
screen-reader-only "sold out"), and the others do not. Restore the count.
*Fixture:*
`select p.slug, v.size, v.inventory_count from public.product_variants v join public.products p on p.id = v.product_id order by p.sort_order, v.sort_order;`
Every variant currently sits at the placeholder 12.

**W6 — The subscriber list and CSV are real.**
*Where:* `/admin/subscribers` → EXPORT CSV, opened on the phone.
*Right answer:* the count matches
`select count(*) from public.subscribers;` (3 today), the file opens as a
spreadsheet, and an unsubscribed row reads as unsubscribed rather than
vanishing.

---

## 3. What is blocked, and by what

**W7 — Mark an order picked up — CANNOT RUN.** There are zero orders, and the
P3 migration is not applied, so a payment cannot become one: every webhook 500s
and the order stays `pending`. Two things unblock it, both human-keyed:

1. Apply `supabase/migrations/20260823000000_checkout_money_path.sql` by hand in
   the Studio SQL editor. The Supabase MCP here is read-only and there is no
   CLI or Docker on this machine. The live schema was checked against the P1
   files and matches, so it applies cleanly.
2. Stripe test keys in `.env.local` (`STRIPE_SECRET_KEY`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; the webhook secret comes from
   `stripe listen`).

Until then: **close P4 on W1–W6 and say in the header that W7 is owed.** Do not
mark P4 BUILT while claiming a proof that did not run — a green gate is not a
runtime pass, and the two claims must never be merged. The admin's order reads
deliberately select only foundation columns
(`features/admin/lib/orders.ts:16`), so the orders screen works against the
un-applied migration; it simply has nothing to display.

---

## 4. Queued behind this

`docs/incomplete/admin-completion/SCOPE.md` — a full audit of the admin, with
GATE 1 answers recorded in §7 on 2026-08-22:

- **In:** announcement composer (O-A), signed-admin preview of the live site
  while closed (O-B), drop dashboard (O-C), editable ticker + coming-soon copy
  (O-F).
- **Refunds (O-D):** Stripe deep link only, plus an admin-side cancel for
  unpaid `pending` orders. No refund button.
- **Pendings (O-E):** filter + manual cancel. No cron.
- **Held:** the sequencing question. Nothing there is planned; Stage 3 was never
  entered and there is no `DESIGN.md` or `PLAN.md` in that folder.

Two findings from that audit are cheap and might reasonably ride along with the
close-out — **ask before doing either**, since both are outside P4's scope:
`features/admin/lib/order-status.ts:96` documents a dashboard count and a
default order filter that neither exist, and
`actions/send-announcement.ts:67` has zero callers in the entire repo.

---

## 5. Gates

```bash
bun run lint && bunx tsc --noEmit && bun run build && bun run test
```

`bun`/`bunx` only, never `npm`/`npx` (BD-1). Run from a cold `.next` if the
build behaves oddly — P2 hit stale generated route-type errors that cleared on
a rebuild.

---

## 6. Watch for

- **The DB is production.** W2, W3 and W5 all mutate rows the public site reads.
  Restore each one immediately and record how long the window was, the way P1
  (49 s) and P2 (~15 s) did.
- **Do not raise a lint cap or loosen a gate** to make something pass.
- **`git add -N` before committing a new file**; never `git add -A`. Zach runs
  parallel sessions against this one tree.
- **Commits are Zach's call** — nothing here auto-pushes.
- **The founder's copy is his.** Any new user-facing string that his mockups do
  not already decide gets 2–3 variations offered in chat, never picked silently.
