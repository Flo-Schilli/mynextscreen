/**
 * Human-readable byte formatting shared across storage/disk displays.
 * Whole bytes render without decimals (e.g. `512 B`); larger units use one
 * decimal place (e.g. `1.5 KB`, `2.0 GB`).
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
