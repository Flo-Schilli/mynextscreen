import { describe, it, expect } from 'vitest';
import {
  estimateOffset,
  median,
  selectOffsetByMinRtt,
  type RoundTripSample,
} from './time-sync.util';

describe('median', () => {
  it('returns the middle value for an odd-length list', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('averages the two middle values for an even-length list', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('is robust to outliers (picks the middle, not the mean)', () => {
    expect(median([10, 11, 12, 13, 1000])).toBe(12);
  });
});

describe('estimateOffset', () => {
  it('returns ~0 when the server and local clocks agree (symmetric RTT)', () => {
    // Request sent at 1000, response received at 1100 (rtt 100), server stamped
    // 1050 = the midpoint → offset 0.
    expect(estimateOffset(1050, 1000, 1100)).toBe(0);
  });

  it('detects a local clock that runs behind the server', () => {
    // Local 1000..1100 (rtt 100); server stamp 1550 → server clock 1600 at
    // receipt vs local 1100 → local is 500ms behind.
    expect(estimateOffset(1550, 1000, 1100)).toBe(500);
  });

  it('detects a local clock that runs ahead of the server', () => {
    expect(estimateOffset(550, 1000, 1100)).toBe(-500);
  });

  it('compensates for round-trip latency via the midpoint assumption', () => {
    // rtt 200 → server stamp + 100 is the receipt-time server clock.
    expect(estimateOffset(2000, 5000, 5200)).toBe(2000 + 100 - 5200);
  });
});

describe('selectOffsetByMinRtt', () => {
  it('returns null for no samples', () => {
    expect(selectOffsetByMinRtt([])).toBeNull();
  });

  it('picks the offset from the lowest-RTT sample, ignoring slow ones', () => {
    const samples: RoundTripSample[] = [
      // Slow first round trip (rtt 1000) — biased, must be ignored.
      { serverTimeMs: 1000, sentAtMs: 0, receivedAtMs: 1000 },
      // Fast round trip (rtt 20) — should win. Offset = 1600 + 10 - 1620 = -10.
      { serverTimeMs: 1600, sentAtMs: 1600, receivedAtMs: 1620 },
    ];
    expect(selectOffsetByMinRtt(samples)).toBe(estimateOffset(1600, 1600, 1620));
  });

  it('uses the single sample when only one is present', () => {
    const samples: RoundTripSample[] = [{ serverTimeMs: 500, sentAtMs: 100, receivedAtMs: 140 }];
    expect(selectOffsetByMinRtt(samples)).toBe(estimateOffset(500, 100, 140));
  });
});
