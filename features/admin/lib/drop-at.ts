import { resolveSiteMode } from "@/lib/site-mode";

/**
 * Is this stored `drop_at`, on its own, holding the storefront open?
 *
 * Asked of `resolveSiteMode` rather than re-derived from the timestamp, so it
 * cannot drift from the rule it is checking. Passing a stored mode of
 * `coming_soon` isolates precedence rule 2 -- "an armed drop_at that has passed
 * reads as live" -- which is the only reason a closed row still serves the
 * store. If P5 ever adds a grace period to that rule, this follows it for free.
 */
export function hasDropAtFired(
  dropAt: unknown,
  now: Date = new Date(),
): boolean {
  return resolveSiteMode("coming_soon", dropAt, now) === "live";
}
