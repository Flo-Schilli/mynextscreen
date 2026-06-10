import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

/** The fully-typed Drizzle client bound to the project schema. */
export type DrizzleDB = NodePgDatabase<typeof schema>;
