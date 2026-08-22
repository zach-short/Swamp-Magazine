# swamp-magazine

Bespoke drop-shop storefront for SWAMP MAGAZINE (founder: Lalo Farro). Next.js
App Router + Supabase + Stripe on Vercel. The process docs are the law:

- `docs/incomplete/foundation/DESIGN.md` — ratified decisions D1–D4 (change by
  dated amendment only, never edited in place)
- `docs/incomplete/foundation/PLAN.md` — phase plan P1–P5, build decisions
  BD-1..6, session protocol

## Commands

- Use `bun` / `bunx`, never `npm` / `npx` (BD-1).
- Gates (all must be green before a phase closes):
  `bun run lint && bunx tsc --noEmit && bun run build && bun run test`
- `bun run seed` — idempotent catalog seed (needs `.env.local`).

## Conventions (inherited from ~/Projects/ezhomesteading)

- Kebab-case for every file and folder. Named exports; components are function
  declarations; no `React.FC`, no `enum`, no `any`.
- `app/` routes render exactly one `*Screen` component from `features/<name>/`;
  features are imported through their root barrel (`@/features/coming-soon`).
- `lib/` is the only utility bucket. Server actions live in `actions/`.
- Env: never read `process.env` in app code — go through `lib/env/client.ts` /
  `lib/env/server.ts` (zod-validated, camelCase). Standalone scripts validate
  their own env inline.
- Action results are discriminated unions:
  `{ status: "success" } | { status: "error"; reason: <literal union> }`.
- No raw hex colors in `.tsx` — tokens live in `app/globals.css` (`emails/` is
  the sanctioned exception; email clients need literals).
- Every tunable product number lives in `config/dials.ts` with a TSDoc note.
- Migrations: `supabase/migrations/<timestamp>_<name>.sql`, each opening with a
  prose header explaining why. RLS on every table; `subscribers`/`orders`/
  `order_items` have NO policies (service-role only) — keep it that way.
- Comments explain *why*, never *what*.

## Hard rules

- NEVER commit `.env` / `.env.local` (gitignored; keep it so).
- The Supabase secret key stays server-side (`lib/env/server.ts` guards via
  `server-only`).
- Prices and stock are read from the DB server-side, never trusted from the
  client (matters from P3 on).
- Copy is the founder's: lift wording from his mockups in `swamp-images/`;
  flag anything invented for his review.
