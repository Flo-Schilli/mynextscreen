import { formatBytes } from '../shared/format-bytes';
import { AuditEntry } from './audit-log.model';

/** Id → display name, as the audit API returns it next to a page of entries. */
export type AuditNames = Record<string, string>;

/** Detail keys that hold the resource's own name, stored for when it is deleted. */
export const RESOURCE_NAME_KEYS = ['name', 'title', 'streamName', 'filename', 'email'];

export interface AuditDetailItem {
  key: string;
  value: string;
  /** Set on an "old → new" item, which is shown even for a name key. */
  isChange?: true;
}

/** Translated words the details are written with. */
export interface AuditLabels {
  /** Marks an id whose record is deleted. */
  gone: string;
  /** Stands for a change recorded without its values. */
  changed: string;
  yes: string;
  no: string;
}

/** The labels in the active language. */
export function auditLabels(transloco: { translate(path: string): string }): AuditLabels {
  return {
    gone: transloco.translate('auditLog.table.deleted'),
    changed: transloco.translate('auditLog.table.changed'),
    yes: transloco.translate('auditLog.table.yes'),
    no: transloco.translate('auditLog.table.no'),
  };
}

/** Old and new value of one changed field; both absent when the values are not logged. */
interface AuditChange {
  from?: unknown;
  to?: unknown;
}

const EMPTY = '–';
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

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

/**
 * The details worth showing, ids replaced by names; nulls and empty lists are left
 * out. A recorded `changes` map becomes one "old → new" item per field.
 */
export function detailItems(
  details: Record<string, unknown> | null,
  names: AuditNames,
  labels: AuditLabels,
): AuditDetailItem[] {
  return Object.entries(details ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .filter(([, value]) => !Array.isArray(value) || value.length > 0)
    .flatMap(([key, value]) =>
      key === 'changes' && isRecord(value)
        ? changeItems(value, names, labels)
        : [{ key, value: displayValue(value, names, labels.gone) }],
    );
}

function changeItems(
  changes: Record<string, unknown>,
  names: AuditNames,
  labels: AuditLabels,
): AuditDetailItem[] {
  return Object.entries(changes)
    .filter((entry): entry is [string, AuditChange] => isRecord(entry[1]))
    .map(([field, change]) => ({
      key: field,
      isChange: true as const,
      value:
        'from' in change || 'to' in change
          ? `${changeValue(field, change.from, names, labels)} → ${changeValue(field, change.to, names, labels)}`
          : labels.changed,
    }));
}

function changeValue(
  field: string,
  value: unknown,
  names: AuditNames,
  labels: AuditLabels,
): string {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (Array.isArray(value) && value.length === 0) return EMPTY;
  if (typeof value === 'boolean') return value ? labels.yes : labels.no;
  if (typeof value === 'number' && field.endsWith('Bytes')) return formatBytes(value);
  if (typeof value === 'string' && ISO_TIMESTAMP.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    }
  }
  return displayValue(value, names, labels.gone);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
