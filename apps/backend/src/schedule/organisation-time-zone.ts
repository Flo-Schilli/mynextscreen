import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../db/drizzle.types';
import { organisations } from '../db/schema';

/**
 * The organisation's IANA time zone, in which its recurring schedule entries
 * repeat. UTC when the organisation is gone, so a stale entry still resolves.
 */
export async function loadOrganisationTimeZone(
  db: DrizzleDB,
  organisationId: string,
): Promise<string> {
  const [org] = await db
    .select({ timeZone: organisations.timeZone })
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .limit(1);
  return org?.timeZone ?? 'UTC';
}
