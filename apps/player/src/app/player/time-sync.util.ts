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

/** One `/api/time` round trip: server stamp plus the local send/receive bounds. */
export interface RoundTripSample {
  serverTimeMs: number;
  sentAtMs: number;
  receivedAtMs: number;
}

/**
 * Pick the offset from the sample with the smallest round-trip time.
 *
 * The lowest-RTT round trip has the least path asymmetry, so the midpoint
 * assumption in {@link estimateOffset} holds best — this is NTP's "best sample"
 * heuristic and beats a median across all samples (a single slow round trip,
 * e.g. the first one paying TCP/TLS setup, no longer biases the result).
 * Returns null for an empty list.
 */
export function selectOffsetByMinRtt(samples: readonly RoundTripSample[]): number | null {
  let best: RoundTripSample | null = null;
  let bestRtt = Number.POSITIVE_INFINITY;
  for (const sample of samples) {
    const rtt = sample.receivedAtMs - sample.sentAtMs;
    if (rtt < bestRtt) {
      bestRtt = rtt;
      best = sample;
    }
  }
  return best ? estimateOffset(best.serverTimeMs, best.sentAtMs, best.receivedAtMs) : null;
}
