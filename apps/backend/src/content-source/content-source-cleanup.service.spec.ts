import { eq } from 'drizzle-orm';
import {
  contents,
  organisations,
  playlistItems,
  playlists,
  sourceEventSlides,
  sourceEvents,
  type SourceEvent,
} from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import { seedContentSource } from '../test/content-source-seed';
import type { ContentService } from '../content/content.service';
import { ContentType } from '../content/content-type.enum';
import { ContentSourceCleanupService } from './content-source-cleanup.service';

describe('ContentSourceCleanupService', () => {
  let db: DrizzleDB;
  let service: ContentSourceCleanupService;
  let contentService: { deleteManaged: jest.Mock };
  let berlinOrgId: string;
  let utcOrgId: string;

  // 23:30 UTC is already 1 December in Berlin, still 30 November in UTC.
  const now = new Date('2026-11-30T23:30:00Z');

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    contentService = {
      deleteManaged: jest.fn(async (_organisationId: string, id: string) => {
        await db.delete(contents).where(eq(contents.id, id));
      }),
    };
    service = new ContentSourceCleanupService(db, contentService as unknown as ContentService);
    const [berlin, utc] = await db
      .insert(organisations)
      .values([
        { name: 'Venue', timeZone: 'Europe/Berlin' },
        { name: 'Other', timeZone: 'UTC' },
      ])
      .returning();
    berlinOrgId = berlin.id;
    utcOrgId = utc.id;
  });

  async function seedEventWithSlide(
    organisationId: string,
    values: Partial<typeof sourceEvents.$inferInsert> = {},
  ): Promise<{ event: SourceEvent; contentId: string }> {
    const source = await seedContentSource(db, organisationId);
    const eventDate = values.eventDate ?? '2026-12-10';
    const [event] = await db
      .insert(sourceEvents)
      .values({
        organisationId,
        sourceId: source.id,
        externalId: `ext-${Math.random()}`,
        title: 'ASP',
        eventDate,
        startsAt: new Date(`${eventDate}T19:00:00Z`),
        venue: 'Löwensaal',
        dataHash: 'h',
        ...values,
      })
      .returning();
    const [content] = await db
      .insert(contents)
      .values({
        organisationId,
        title: 'Slide',
        type: ContentType.Image,
        originalFilename: 's.jpg',
        originalMimeType: 'image/jpeg',
        originalSizeBytes: 1,
        managedBySourceId: source.id,
      })
      .returning();
    await db.insert(sourceEventSlides).values({
      sourceEventId: event.id,
      format: '1920x1080',
      contentId: content.id,
      renderHash: 'r',
    });
    return { event, contentId: content.id };
  }

  async function addToPlaylist(organisationId: string, contentId: string): Promise<void> {
    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId, name: 'Static' })
      .returning();
    await db
      .insert(playlistItems)
      .values({ playlistId: playlist.id, contentId, position: 0, durationSeconds: 10 });
  }

  const eventIds = async (): Promise<string[]> =>
    (await db.select({ id: sourceEvents.id }).from(sourceEvents)).map((row) => row.id);

  it('deletes slides of events that ended more than 14 days ago in the organisation’s zone', async () => {
    // Berlin: today 2026-12-01, so the cutoff is 2026-11-17.
    const old = await seedEventWithSlide(berlinOrgId, { eventDate: '2026-11-16' });
    const edge = await seedEventWithSlide(berlinOrgId, { eventDate: '2026-11-17' });
    // UTC: today 2026-11-30, so the same date is still inside the 14 days.
    const utcEdge = await seedEventWithSlide(utcOrgId, { eventDate: '2026-11-16' });

    const result = await service.cleanup(now);

    expect(contentService.deleteManaged).toHaveBeenCalledTimes(1);
    expect(contentService.deleteManaged).toHaveBeenCalledWith(berlinOrgId, old.contentId);
    expect(result).toEqual({ slidesDeleted: 1, slidesFailed: 0, eventsDeleted: 0 });
    const remaining = await db.select({ id: contents.id }).from(contents);
    expect(remaining.map((row) => row.id).sort()).toEqual(
      [edge.contentId, utcEdge.contentId].sort(),
    );
  });

  it('keeps the row of a past event the source still lists, so the next sync does not re-create it', async () => {
    const old = await seedEventWithSlide(berlinOrgId, { eventDate: '2026-11-01' });

    await service.cleanup(now);

    expect(await eventIds()).toEqual([old.event.id]);
    expect(await db.select().from(sourceEventSlides)).toHaveLength(0);
  });

  it('deletes slides and row of a gone event, also a future one', async () => {
    await seedEventWithSlide(berlinOrgId, {
      eventDate: '2027-01-20',
      goneAt: new Date('2026-11-29T10:00:00Z'),
    });

    const result = await service.cleanup(now);

    expect(result).toEqual({ slidesDeleted: 1, slidesFailed: 0, eventsDeleted: 1 });
    expect(await eventIds()).toEqual([]);
  });

  it('keeps slides that a playlist still shows, and the gone event they belong to', async () => {
    const shown = await seedEventWithSlide(berlinOrgId, {
      eventDate: '2026-10-01',
      goneAt: new Date('2026-11-01T10:00:00Z'),
    });
    await addToPlaylist(berlinOrgId, shown.contentId);

    const result = await service.cleanup(now);

    expect(contentService.deleteManaged).not.toHaveBeenCalled();
    expect(result).toEqual({ slidesDeleted: 0, slidesFailed: 0, eventsDeleted: 0 });
    expect(await eventIds()).toEqual([shown.event.id]);
  });

  it('leaves current events alone', async () => {
    await seedEventWithSlide(berlinOrgId, { eventDate: '2026-12-01' });
    await seedEventWithSlide(utcOrgId, { eventDate: '2026-11-29' });

    await expect(service.cleanup(now)).resolves.toEqual({
      slidesDeleted: 0,
      slidesFailed: 0,
      eventsDeleted: 0,
    });
    expect(contentService.deleteManaged).not.toHaveBeenCalled();
  });

  it('counts a failed delete, carries on and keeps the event whose slide survived', async () => {
    const failing = await seedEventWithSlide(berlinOrgId, {
      eventDate: '2026-12-20',
      goneAt: new Date('2026-11-29T10:00:00Z'),
    });
    await seedEventWithSlide(berlinOrgId, {
      eventDate: '2026-12-21',
      goneAt: new Date('2026-11-29T10:00:00Z'),
    });
    const deleteRow = contentService.deleteManaged.getMockImplementation();
    contentService.deleteManaged.mockImplementation(async (organisationId: string, id: string) => {
      if (id === failing.contentId) throw new Error('disk full');
      await deleteRow?.(organisationId, id);
    });

    const result = await service.cleanup(now);

    expect(result).toEqual({ slidesDeleted: 1, slidesFailed: 1, eventsDeleted: 1 });
    expect(await eventIds()).toEqual([failing.event.id]);
  });
});
