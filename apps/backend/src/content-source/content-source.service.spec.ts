import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import {
  contentSources,
  contents,
  organisations,
  sourceEventSlides,
  sourceEvents,
} from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import { seedContentSource } from '../test/content-source-seed';
import { ContentService } from '../content/content.service';
import { ContentType } from '../content/content-type.enum';
import {
  AUDIT_CONTENT_SOURCE_CREATED,
  AUDIT_CONTENT_SOURCE_DELETED,
  AUDIT_CONTENT_SOURCE_UPDATED,
} from '../audit-log/audit.events';
import { ContentSourceAdapterRegistry } from './adapter.registry';
import { ConcertbueroFrankenAdapter } from './adapters/concertbuero-franken.adapter';
import { ContentSourceService } from './content-source.service';
import { DEFAULT_SLIDE_STYLE } from './content-source.types';

describe('ContentSourceService', () => {
  let db: DrizzleDB;
  let service: ContentSourceService;
  let queue: { add: jest.Mock };
  let contentService: { deleteManaged: jest.Mock };
  let emit: jest.Mock;
  let orgId: string;
  let otherOrgId: string;

  const userId = '880e8400-e29b-41d4-a716-446655440000';

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    queue = { add: jest.fn().mockResolvedValue({ id: 'job' }) };
    contentService = {
      deleteManaged: jest.fn(async (organisationId: string, id: string) => {
        await db.delete(contents).where(eq(contents.id, id));
        return organisationId;
      }),
    };
    emit = jest.fn();
    service = new ContentSourceService(
      db,
      queue as unknown as Queue,
      new ContentSourceAdapterRegistry(new ConcertbueroFrankenAdapter()),
      contentService as unknown as ContentService,
      { emit } as unknown as EventEmitter2,
    );
    const [org, other] = await db
      .insert(organisations)
      .values([
        { name: 'Venue', timeZone: 'Europe/Berlin' },
        { name: 'Other', timeZone: 'UTC' },
      ])
      .returning();
    orgId = org.id;
    otherOrgId = other.id;
  });

  async function seedEvent(
    sourceId: string,
    organisationId: string,
    values: Partial<typeof sourceEvents.$inferInsert> = {},
  ) {
    const [event] = await db
      .insert(sourceEvents)
      .values({
        organisationId,
        sourceId,
        externalId: `ext-${Math.random()}`,
        title: 'ASP',
        eventDate: '2026-11-10',
        startsAt: new Date('2026-11-10T19:00:00Z'),
        venue: 'Löwensaal',
        dataHash: 'h',
        ...values,
      })
      .returning();
    return event;
  }

  describe('create', () => {
    it('stores validated params, default style and audits', async () => {
      const source = await service.create(
        orgId,
        { name: 'Concerts', adapterType: 'concertbuero-franken', formats: ['1920x1080'] },
        userId,
      );

      expect(source).toMatchObject({
        organisationId: orgId,
        params: { monthsAhead: 6 },
        style: DEFAULT_SLIDE_STYLE,
        syncIntervalMinutes: 360,
        enabled: true,
        nextSyncAt: null,
      });
      expect(emit).toHaveBeenCalledWith(
        AUDIT_CONTENT_SOURCE_CREATED,
        expect.objectContaining({ sourceId: source.id, userId }),
      );
    });

    it('rejects an unknown adapter and invalid params', async () => {
      await expect(
        service.create(orgId, { name: 'X', adapterType: 'nope', formats: ['1920x1080'] }, userId),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create(
          orgId,
          {
            name: 'X',
            adapterType: 'concertbuero-franken',
            params: { monthsAhead: 99 },
            formats: ['1920x1080'],
          },
          userId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('read', () => {
    it('lists only the organisation’s sources in natural order', async () => {
      await seedContentSource(db, orgId, { name: 'Source 10' });
      await seedContentSource(db, orgId, { name: 'Source 2' });
      await seedContentSource(db, otherOrgId, { name: 'Foreign' });

      const result = await service.findAll(orgId);

      expect(result.map((s) => s.name)).toEqual(['Source 2', 'Source 10']);
    });

    it('does not find a source of another organisation', async () => {
      const foreign = await seedContentSource(db, otherOrgId);

      await expect(service.findOne(orgId, foreign.id)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('describes the registered adapters', () => {
      expect(service.adapters().map((a) => a.type)).toEqual(['concertbuero-franken']);
    });
  });

  describe('update', () => {
    it('updates fields and reschedules on a new interval', async () => {
      const lastSyncAt = new Date('2026-11-01T10:00:00Z');
      const source = await seedContentSource(db, orgId, { lastSyncAt, syncIntervalMinutes: 360 });

      const saved = await service.update(
        orgId,
        source.id,
        {
          name: 'Renamed',
          params: { monthsAhead: 3 },
          formats: ['1080x1920'],
          style: { background: 'blur', accentColor: '#112233' },
          enabled: false,
          syncIntervalMinutes: 60,
        },
        userId,
      );

      expect(saved).toMatchObject({
        name: 'Renamed',
        params: { monthsAhead: 3 },
        formats: ['1080x1920'],
        style: { background: 'blur', accentColor: '#112233' },
        enabled: false,
        syncIntervalMinutes: 60,
      });
      expect(saved.nextSyncAt?.toISOString()).toBe('2026-11-01T11:00:00.000Z');
      expect(emit).toHaveBeenCalledWith(AUDIT_CONTENT_SOURCE_UPDATED, expect.anything());
    });

    it('makes a never-synced source due when the interval changes', async () => {
      const source = await seedContentSource(db, orgId, { nextSyncAt: new Date('2030-01-01') });

      const saved = await service.update(orgId, source.id, { syncIntervalMinutes: 30 }, userId);

      expect(saved.nextSyncAt).toBeNull();
    });

    it('keeps the schedule when the interval is unchanged', async () => {
      const next = new Date('2030-01-01T00:00:00Z');
      const source = await seedContentSource(db, orgId, { nextSyncAt: next });

      const saved = await service.update(orgId, source.id, { syncIntervalMinutes: 360 }, userId);

      expect(saved.nextSyncAt?.toISOString()).toBe(next.toISOString());
    });
  });

  describe('remove', () => {
    it('deletes managed slides through the content service, then the source', async () => {
      const source = await seedContentSource(db, orgId);
      const [slide] = await db
        .insert(contents)
        .values({
          organisationId: orgId,
          title: 'Slide',
          type: ContentType.Image,
          originalFilename: 's.jpg',
          originalMimeType: 'image/jpeg',
          originalSizeBytes: 1,
          managedBySourceId: source.id,
        })
        .returning();

      await service.remove(orgId, source.id, userId);

      expect(contentService.deleteManaged).toHaveBeenCalledWith(orgId, slide.id);
      expect(await db.select().from(contentSources)).toHaveLength(0);
      expect(emit).toHaveBeenCalledWith(
        AUDIT_CONTENT_SOURCE_DELETED,
        expect.objectContaining({ details: { name: 'Concerts', slidesDeleted: 1 } }),
      );
    });

    it('refuses to delete a foreign source', async () => {
      const foreign = await seedContentSource(db, otherOrgId);

      await expect(service.remove(orgId, foreign.id, userId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(await db.select().from(contentSources)).toHaveLength(1);
    });
  });

  describe('sync scheduling', () => {
    it('queues a sync with a per-source job id that is removed when done', async () => {
      const source = await seedContentSource(db, orgId);

      await expect(service.requestSync(orgId, source.id, userId)).resolves.toEqual({
        queued: true,
      });

      expect(queue.add).toHaveBeenCalledWith(
        'sync',
        { sourceId: source.id, triggeredBy: userId },
        { jobId: `sync-${source.id}`, removeOnComplete: true, removeOnFail: true },
      );
    });

    it('does not queue a sync for a foreign source', async () => {
      const foreign = await seedContentSource(db, otherOrgId);

      await expect(service.requestSync(orgId, foreign.id, userId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('queues the cleanup once per day, keeping the finished job so its id stays taken', async () => {
      await service.enqueueCleanup('2026-11-01');

      expect(queue.add).toHaveBeenCalledWith(
        'cleanup',
        { day: '2026-11-01' },
        {
          jobId: 'cleanup-2026-11-01',
          removeOnComplete: { age: 172_800 },
          removeOnFail: { age: 172_800 },
        },
      );
    });

    it('finds enabled sources that are due or never ran', async () => {
      const now = new Date('2026-11-01T10:00:00Z');
      const never = await seedContentSource(db, orgId, { name: 'never' });
      const due = await seedContentSource(db, orgId, {
        nextSyncAt: new Date('2026-11-01T09:00:00Z'),
      });
      await seedContentSource(db, orgId, { nextSyncAt: new Date('2026-11-01T11:00:00Z') });
      await seedContentSource(db, orgId, { enabled: false });

      const ids = await service.findDueSourceIds(now);

      expect(ids.sort()).toEqual([never.id, due.id].sort());
    });
  });

  describe('event pool', () => {
    it('filters by date, venue, genre and gone state and attaches slides', async () => {
      const source = await seedContentSource(db, orgId);
      const metal = await seedEvent(source.id, orgId, { genres: ['Metal'], title: 'Metal' });
      await seedEvent(source.id, orgId, { genres: ['Pop'], venue: 'Hirsch', title: 'Pop' });
      await seedEvent(source.id, orgId, { eventDate: '2027-02-01', title: 'Late' });
      await seedEvent(source.id, orgId, { goneAt: new Date(), title: 'Gone' });
      const [content] = await db
        .insert(contents)
        .values({
          organisationId: orgId,
          title: 'Slide',
          type: ContentType.Image,
          originalFilename: 's.jpg',
          originalMimeType: 'image/jpeg',
          originalSizeBytes: 1,
          managedBySourceId: source.id,
        })
        .returning();
      await db.insert(sourceEventSlides).values({
        sourceEventId: metal.id,
        format: '1920x1080',
        contentId: content.id,
        renderHash: 'r',
      });

      const byGenre = await service.listEvents(orgId, source.id, { genres: ['Metal'] });
      expect(byGenre.map((e) => e.title)).toEqual(['Metal']);
      // updatedAt versions the thumbnail URL, so a re-rendered slide is not served from cache.
      expect(byGenre[0].slides).toEqual([
        { format: '1920x1080', contentId: content.id, updatedAt: content.updatedAt },
      ]);

      const byVenue = await service.listEvents(orgId, source.id, { venues: ['Hirsch'] });
      expect(byVenue.map((e) => e.title)).toEqual(['Pop']);

      const byDate = await service.listEvents(orgId, source.id, {
        from: '2027-01-01',
        to: '2027-12-31',
      });
      expect(byDate.map((e) => e.title)).toEqual(['Late']);

      const all = await service.listEvents(orgId, source.id, { includeGone: true, limit: 10 });
      expect(all).toHaveLength(4);

      const current = await service.listEvents(orgId, source.id, {});
      expect(current.map((e) => e.title)).not.toContain('Gone');
    });

    it('returns an empty pool without querying slides', async () => {
      const source = await seedContentSource(db, orgId);

      await expect(service.listEvents(orgId, source.id, {})).resolves.toEqual([]);
    });

    it('does not expose the pool of a foreign source', async () => {
      const foreign = await seedContentSource(db, otherOrgId);

      await expect(service.listEvents(orgId, foreign.id, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('loads the rule pool of several sources from a date on, scoped to the organisation', async () => {
      const a = await seedContentSource(db, orgId);
      const b = await seedContentSource(db, orgId);
      const c = await seedContentSource(db, orgId);
      const foreign = await seedContentSource(db, otherOrgId);
      await seedEvent(a.id, orgId, { title: 'A', eventDate: '2026-11-10' });
      await seedEvent(b.id, orgId, { title: 'B', eventDate: '2026-11-12' });
      await seedEvent(a.id, orgId, { title: 'Old', eventDate: '2026-11-01' });
      await seedEvent(a.id, orgId, { title: 'Gone', goneAt: new Date() });
      await seedEvent(c.id, orgId, { title: 'Other source' });
      await seedEvent(foreign.id, otherOrgId, { title: 'Foreign' });

      const pool = await service.findPool(orgId, [a.id, b.id, foreign.id], '2026-11-09');

      expect(pool.map((event) => event.title)).toEqual(['A', 'B']);
      expect(pool[0].slides).toEqual([]);
      await expect(service.findPool(orgId, [], '2026-11-09')).resolves.toEqual([]);
    });

    it('collects venue and genre facets per organisation and source', async () => {
      const a = await seedContentSource(db, orgId);
      const b = await seedContentSource(db, orgId);
      const foreign = await seedContentSource(db, otherOrgId);
      await seedEvent(a.id, orgId, { venue: 'Z-Bau', genres: ['Metal', 'Rock'] });
      await seedEvent(a.id, orgId, { venue: 'Hirsch', genres: ['Metal'] });
      await seedEvent(b.id, orgId, { venue: 'Löwensaal', genres: ['Pop'] });
      await seedEvent(a.id, orgId, { venue: 'Old', genres: ['Jazz'], goneAt: new Date() });
      await seedEvent(foreign.id, otherOrgId, { venue: 'Elsewhere', genres: ['Folk'] });

      await expect(service.facets(orgId, {})).resolves.toEqual({
        venues: ['Hirsch', 'Löwensaal', 'Z-Bau'],
        genres: ['Metal', 'Pop', 'Rock'],
      });
      await expect(service.facets(orgId, { sourceIds: [b.id] })).resolves.toEqual({
        venues: ['Löwensaal'],
        genres: ['Pop'],
      });
    });
  });
});
