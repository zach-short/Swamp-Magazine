// Money in this codebase is always integer cents -- the DB column is
// `price_cents`, Stripe speaks cents, and a float dollar amount that survives
// a round trip through the admin is how a $19.99 shirt quietly becomes $19.98.
// Formatting and parsing live together so the two can never disagree.

/**
 * The mockups price in whole dollars ("PLEASE VENMO $20"), so cents only show
 * up when a price actually carries them -- a $22.50 SKU must not read "$22".
 */
export function formatUsd(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const body =
    abs % 100 === 0 ? `$${abs / 100}` : `$${(abs / 100).toFixed(2)}`;
  return negative ? `-${body}` : body;
}

/**
 * Parses what the founder types into a price field. Deliberately string-based
 * rather than `Number(value) * 100`: 19.99 * 100 is 1998.9999999999998 in
 * IEEE-754, and rounding that back is a coin flip nobody should be taking with
 * a price. Splitting on the decimal point keeps the cents exact.
 *
 * Accepts "$20", "20", "20.5", "20.50", " 20 ". Returns null for anything else,
 * including negatives and more than two decimal places -- a typo must fail
 * loudly rather than round into a real price.
 */
export function parseUsdToCents(value: string): number | null {
  const trimmed = value.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const [whole, fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
