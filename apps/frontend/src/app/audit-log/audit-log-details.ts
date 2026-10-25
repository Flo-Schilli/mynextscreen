import { AuditEntry } from './audit-log.model';

/** Id → display name, as the audit API returns it next to a page of entries. */
export type AuditNames = Record<string, string>;

/** Detail keys that hold the resource's own name, stored for when it is deleted. */
export const RESOURCE_NAME_KEYS = ['name', 'title', 'streamName', 'filename', 'email'];

export interface AuditDetailItem {
  key: string;
  value: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Turns ids into names; an id the server could not name belongs to a deleted record. */
export function displayValue(value: unknown, names: AuditNames, goneLabel: string): string {
  if (Array.isArray(value)) return value.map((v) => displayValue(v, names, goneLabel)).join(', ');
  if (typeof value === 'string' && UUID.test(value)) {
    return names[value.toLowerCase()] ?? goneId(value, goneLabel);
  }
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Translated label for a details key; a key without a translation is shown as it is. */
export function detailLabel(translate: (path: string) => string, key: string): string {
  const path = `auditLog.detailKeys.${key}`;
  const label = translate(path);
  return label === path ? key : label;
}

/** A short id marked as belonging to a deleted record. */
export function goneId(id: string, goneLabel: string): string {
  return `${id.substring(0, 8)} (${goneLabel})`;
}

/**
 * The resource's current name; for a deleted one the name stored with the entry,
 * else a short id marked as deleted. Null when the entry has no resource.
 */
export function resourceName(
  entry: AuditEntry,
  names: AuditNames,
  goneLabel: string,
): string | null {
  if (!entry.resourceId) return null;
  const current = names[entry.resourceId.toLowerCase()];
  if (current) return current;
  for (const key of RESOURCE_NAME_KEYS) {
    const stored = entry.details?.[key];
    if (typeof stored === 'string' && stored) return stored;
  }
  return goneId(entry.resourceId, goneLabel);
}

/** The details worth showing, ids replaced by names; nulls and empty lists are left out. */
export function detailItems(
  details: Record<string, unknown> | null,
  names: AuditNames,
  goneLabel: string,
): AuditDetailItem[] {
  return Object.entries(details ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .filter(([, value]) => !Array.isArray(value) || value.length > 0)
    .map(([key, value]) => ({ key, value: displayValue(value, names, goneLabel) }));
}
