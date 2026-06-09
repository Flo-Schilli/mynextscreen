const UNIT_TO_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/** Parse a TTL string like `15m`, `1h`, `30d`, `90s` into seconds. */
export function parseTtlToSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) {
    throw new Error(`Invalid TTL "${ttl}". Expected format like 15m, 1h, 30d, 90s.`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const factor = UNIT_TO_SECONDS[unit];
  if (!factor) {
    throw new Error(`Invalid TTL unit "${unit}".`);
  }
  return value * factor;
}
