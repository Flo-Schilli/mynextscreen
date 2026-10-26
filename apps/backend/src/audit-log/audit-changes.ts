/**
 * Old and new value of one field an update changed. Both are absent for a
 * field whose values must not reach the audit log (it only shows that it changed).
 */
export interface AuditChange {
  from?: unknown;
  to?: unknown;
}

/** Field → change, stored as `details.changes` on update entries. */
export type AuditChanges = Record<string, AuditChange>;

export interface AuditChangesOptions<K extends string> {
  /** Fields recorded as changed without their values (secrets, opaque settings). */
  hidden?: readonly K[];
  /** Turns a value into what the log may show, e.g. a URL without its credentials. */
  map?: Partial<Record<K, (value: unknown) => unknown>>;
}

/**
 * The fields among `fields` whose value differs between `before` and `after`.
 * Dates become ISO strings and undefined becomes null, so the result is plain
 * JSON; lists and objects are compared by value.
 */
export function auditChanges<T extends object, K extends keyof T & string>(
  before: T,
  after: T,
  fields: readonly K[],
  options: AuditChangesOptions<K> = {},
): AuditChanges {
  const changes: AuditChanges = {};
  for (const field of fields) {
    const mapper = options.map?.[field] ?? ((value: unknown): unknown => value);
    const from = mapper(plain(before[field]));
    const to = mapper(plain(after[field]));
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    changes[field] = options.hidden?.includes(field) ? {} : { from, to };
  }
  return changes;
}

/** A URL with any `user:password@` part replaced by `***@`; other values unchanged. */
export function withoutUrlCredentials(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    const url = new URL(value);
    if (!url.username && !url.password) return value;
    return value.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/]*@/i, '$1***@');
  } catch {
    return value;
  }
}

function plain(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

/** A list of ids in a stable order, for lists the database returns unordered. */
export function sortedIds(value: unknown): unknown {
  return Array.isArray(value) ? [...value].sort() : value;
}
