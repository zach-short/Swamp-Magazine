// Pure helpers for the drop announcement (P5). They live outside the action
// because a "use server" module may only export async functions -- and because
// a mis-sized batch is a silent failure (Resend rejects or throttles the call
// and part of the list never hears about the drop), so it gets a test.

// Splits recipients into Resend-sized batches, preserving order and including
// every item exactly once.
export function splitIntoBatches<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    // Louder than clamping: a bad dial should stop the send, not quietly
    // reshape it into one giant call.
    throw new RangeError(`batch size must be a positive integer, got ${size}`);
  }

  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

// Every send carries one of these (CAN-SPAM). The token is the subscriber id,
// so the link works with no session and stays valid forever.
export function buildUnsubscribeUrl(origin: string, subscriberId: string): string {
  const url = new URL("/unsubscribe", origin);
  url.searchParams.set("id", subscriberId);
  return url.toString();
}
