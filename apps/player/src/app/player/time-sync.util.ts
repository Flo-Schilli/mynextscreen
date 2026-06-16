/**
 * Pure clock-offset math for {@link TimeSyncService}. Kept free of Angular
 * imports so it can be unit-tested without the JIT compiler.
 */

/** Median of a non-empty list of numbers. */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Estimate this device's offset to the server clock from one round-trip.
 *
 * Assumes a symmetric path, so the server timestamp corresponds to the midpoint
 * of the request: `serverNow ≈ serverTime + rtt/2` at response receipt.
 * Returns `serverNowAtReceipt − localReceipt`, i.e. the value to add to the
 * local clock to obtain server time.
 */
export function estimateOffset(
  serverTimeMs: number,
  requestSentAtMs: number,
  responseReceivedAtMs: number,
): number {
  const rtt = responseReceivedAtMs - requestSentAtMs;
  const serverNowAtReceipt = serverTimeMs + rtt / 2;
  return serverNowAtReceipt - responseReceivedAtMs;
}
