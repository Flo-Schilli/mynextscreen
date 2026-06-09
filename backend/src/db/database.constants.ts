/** DI token for the typed Drizzle client. */
export const DRIZZLE = Symbol('DRIZZLE');

/** DI token for the underlying pg Pool (health checks / shutdown). */
export const PG_POOL = Symbol('PG_POOL');
