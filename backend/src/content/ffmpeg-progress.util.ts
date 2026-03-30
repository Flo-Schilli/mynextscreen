/**
 * Parses FFmpeg stderr output to extract transcoding progress percentage.
 *
 * FFmpeg reports progress like:
 *   frame=  120 fps= 30 ... time=00:00:04.00 bitrate= 1234.5kbits/s ...
 *
 * We extract the `time=HH:MM:SS.ss` field and compare it against the total
 * duration to compute a percentage.
 */

const TIME_PATTERN = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/;
const DURATION_PATTERN = /Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/;

/**
 * Parses a time string in HH:MM:SS.cs format to total seconds.
 */
function parseTimeToSeconds(
  hours: string,
  minutes: string,
  seconds: string,
  centiseconds: string,
): number {
  return (
    parseInt(hours, 10) * 3600 +
    parseInt(minutes, 10) * 60 +
    parseInt(seconds, 10) +
    parseInt(centiseconds, 10) / 100
  );
}

/**
 * Extracts the total duration from FFmpeg stderr output.
 * Returns duration in seconds, or null if not found.
 */
export function parseDuration(stderrChunk: string): number | null {
  const match = stderrChunk.match(DURATION_PATTERN);
  if (!match) return null;
  return parseTimeToSeconds(match[1], match[2], match[3], match[4]);
}

/**
 * Extracts the current progress time from FFmpeg stderr output.
 * Returns progress in seconds, or null if not found.
 */
export function parseProgressTime(stderrChunk: string): number | null {
  const match = stderrChunk.match(TIME_PATTERN);
  if (!match) return null;
  return parseTimeToSeconds(match[1], match[2], match[3], match[4]);
}

/**
 * Calculates transcoding progress as a percentage (0–100).
 * Returns null if either value is missing or duration is zero.
 */
export function calculateProgress(
  currentTimeSeconds: number | null,
  totalDurationSeconds: number | null,
): number | null {
  if (
    currentTimeSeconds === null ||
    totalDurationSeconds === null ||
    totalDurationSeconds <= 0
  ) {
    return null;
  }
  const pct = (currentTimeSeconds / totalDurationSeconds) * 100;
  return Math.min(100, Math.round(pct));
}
