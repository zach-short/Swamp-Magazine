export type SiteMode = "coming_soon" | "live";

// Fail closed: anything unexpected -- missing row, fetch failure, bad value --
// resolves to coming_soon rather than accidentally exposing the storefront.
//
// Precedence, settled at P5 when drop_at was armed:
//   1. mode === "live" wins outright. A founder who flips the switch by hand is
//      never second-guessed by a stale or absent timestamp.
//   2. otherwise an armed drop_at that has passed reads as live. That is the
//      whole point of arming it -- the drop fires with nobody at a keyboard,
//      and the row still says coming_soon until someone edits it.
//   3. otherwise coming_soon.
// The corollary of (2) is that an explicit coming_soon does NOT override a
// drop_at in the past: if it did, rule (2) could never fire, since a stored
// mode of coming_soon is exactly the state an armed countdown sits in. Pulling
// the site back after the drop therefore means clearing drop_at (or pushing it
// into the future), which the admin sets on the same form as the mode.
export function resolveSiteMode(
  mode: unknown,
  dropAt?: unknown,
  now: Date = new Date(),
): SiteMode {
  if (mode === "live") return "live";

  const target = parseDropAt(dropAt);
  return target !== null && target.getTime() <= now.getTime()
    ? "live"
    : "coming_soon";
}

// Only the shapes that actually reach us parse: a timestamptz string from
// Postgres, or a Date from admin code. Everything else -- null, "", a number,
// "soon" -- is treated as "not armed", which leaves the site closed.
export function parseDropAt(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
