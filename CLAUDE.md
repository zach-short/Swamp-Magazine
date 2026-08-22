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
  `bun run lint && bun run build && bunx tsc --noEmit && bun run test`
  **`build` must precede `tsc`.** Next only generates the route-type tree
  (`PageProps`/`LayoutProps`) during `next build`, so on a cold `.next` the
  reverse order fails tsc on generated types that do not exist yet. Cost a
  full rebuild at the P4 close; see `RUNTIME-PASS.md` §P4 "Gates at this pass".
  If route types still look wrong, `rm -rf .next` — a plain rebuild does not
  rewrite the dev-server-generated `.next/dev/types` tree.
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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
