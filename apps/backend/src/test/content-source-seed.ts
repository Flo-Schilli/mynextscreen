import { contentSources, type ContentSource } from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';

/** Inserts a minimal content source, e.g. to own managed content in a spec. */
export async function seedContentSource(
  db: DrizzleDB,
  organisationId: string,
  overrides: Partial<ContentSource> = {},
): Promise<ContentSource> {
  const [source] = await db
    .insert(contentSources)
    .values({
      organisationId,
      name: 'Concerts',
      adapterType: 'concertbuero-franken',
      formats: ['1920x1080'],
      style: { background: 'black', accentColor: '#e30613' },
      ...overrides,
    })
    .returning();
  return source;
}
