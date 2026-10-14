import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import {
  contentSources,
  contents,
  organisations,
  playlistItems,
  playlists,
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
import {
  CONTENT_SOURCE_REMOVED,
  CONTENT_SOURCE_VENUE_ALIASES_UPDATED,
} from './content-source.constants';
import { PLAYLIST_UPDATED } from '../playlist/playlist.event';

describe('ContentSourceService', () => {
  let db: DrizzleDB;
  let service: ContentSourceService;
  let queue: { add: jest.Mock; getJob: jest.Mock };
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
    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job' }),
      getJob: jest.fn().mockResolvedValue(undefined),
    };
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
        venueAliases: [],
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

    it('stores new venue aliases and announces them', async () => {
      const source = await seedContentSource(db, orgId);
      const venueAliases = [{ raw: 'Der Hirsch', canonical: 'Hirsch' }];

      const saved = await service.update(orgId, source.id, { venueAliases }, userId);

      expect(saved.venueAliases).toEqual(venueAliases);
      expect(emit).toHaveBeenCalledWith(
        CONTENT_SOURCE_VENUE_ALIASES_UPDATED,
        expect.objectContaining({ sourceId: source.id, organisationId: orgId }),
      );
    });

    it('does not announce an alias list that only changed its order', async () => {
      const source = await seedContentSource(db, orgId, {
        venueAliases: [
          { raw: 'Der Hirsch', canonical: 'Hirsch' },
          { raw: 'Z-Bau Galerie', canonical: 'Z-Bau' },
        ],
      });

      await service.update(
        orgId,
        source.id,
        {
          venueAliases: [
            { raw: 'Z-Bau Galerie', canonical: 'Z-Bau' },
            { raw: 'Der Hirsch', canonical: 'Hirsch' },
          ],
        },
        userId,
      );

      expect(emit).not.toHaveBeenCalled();
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
    async function insertSlide(sourceId: string) {
      const [slide] = await db
        .insert(contents)
        .values({
          organisationId: orgId,
          title: 'Slide',
          type: ContentType.Image,
          originalFilename: 's.jpg',
          originalMimeType: 'image/jpeg',
          originalSizeBytes: 1,
          managedBySourceId: sourceId,
        })
        .returning();
      return slide;
    }

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

    it('lets a slide that a running sync creates meanwhile fail instead of orphaning it', async () => {
      const source = await seedContentSource(db, orgId);
      await insertSlide(source.id);
      let concurrentCreate: Promise<unknown> | null = null;
      const deleteRow = contentService.deleteManaged.getMockImplementation()!;
      contentService.deleteManaged.mockImplementation(
        async (organisationId: string, id: string) => {
          // A sync stores a new slide while the removal is under way.
          concurrentCreate ??= insertSlide(source.id);
          await new Promise((resolve) => setTimeout(resolve, 100));
          return deleteRow(organisationId, id);
        },
      );

      await service.remove(orgId, source.id, userId);

      await expect(concurrentCreate).rejects.toThrow();
      expect(await db.select().from(contents)).toEqual([]);
    });

    it('announces the playlists that showed its slides and the removal itself', async () => {
      const source = await seedContentSource(db, orgId);
      const slide = await insertSlide(source.id);
      const [playlist] = await db
        .insert(playlists)
        .values({ organisationId: orgId, name: 'Concerts' })
        .returning();
      await db
        .insert(playlistItems)
        .values({ playlistId: playlist.id, contentId: slide.id, position: 0, durationSeconds: 8 });

      await service.remove(orgId, source.id, userId);

      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: playlist.id, organisationId: orgId }),
      );
      expect(emit).toHaveBeenCalledWith(
        CONTENT_SOURCE_REMOVED,
        expect.objectContaining({ sourceId: source.id, organisationId: orgId }),
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

    it('marks the source due when its sync is already running', async () => {
      const later = new Date('2099-01-01T00:00:00Z');
      const source = await seedContentSource(db, orgId, { nextSyncAt: later });
      const waiting = await seedContentSource(db, orgId, { nextSyncAt: later });
      queue.getJob.mockImplementation(async (jobId: string) => ({
        isActive: jest.fn().mockResolvedValue(jobId === `sync-${source.id}`),
      }));
      const before = Date.now();

      await service.enqueueSync(source.id, null);
      await service.enqueueSync(waiting.id, null);

      const row = async (id: string) =>
        (await db.select().from(contentSources).where(eq(contentSources.id, id)))[0];
      const { nextSyncAt } = await row(source.id);
      expect(nextSyncAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(nextSyncAt!.getTime()).toBeLessThanOrEqual(Date.now());
      expect((await row(waiting.id)).nextSyncAt).toEqual(later);
    });

    it('leaves a running source alone when the scheduler queues it', async () => {
      const due = new Date('2026-01-01T00:00:00Z');
      const source = await seedContentSource(db, orgId, { nextSyncAt: due });
      queue.getJob.mockResolvedValue({ isActive: jest.fn().mockResolvedValue(true) });

      await service.enqueueScheduledSync(source.id);

      const [row] = await db.select().from(contentSources).where(eq(contentSources.id, source.id));
      expect(row.nextSyncAt).toEqual(due);
      expect(queue.add).toHaveBeenCalledWith(
        'sync',
        { sourceId: source.id, triggeredBy: null },
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

    it('queues the cleanup per day, keeping only a finished job so a failed one can rerun', async () => {
      await service.enqueueCleanup('2026-11-01');

      expect(queue.add).toHaveBeenCalledWith(
        'cleanup',
        { day: '2026-11-01' },
        {
          jobId: 'cleanup-2026-11-01',
          removeOnComplete: { age: 172_800 },
          removeOnFail: true,
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

      const { data: byGenre, total } = await service.listEvents(orgId, source.id, {
        genres: ['Metal'],
      });
      expect(byGenre.map((e) => e.title)).toEqual(['Metal']);
      expect(total).toBe(1);
      // updatedAt versions the thumbnail URL, so a re-rendered slide is not served from cache.
      expect(byGenre[0].slides).toEqual([
        { format: '1920x1080', contentId: content.id, updatedAt: content.updatedAt },
      ]);

      const byVenue = await service.listEvents(orgId, source.id, { venues: ['Hirsch'] });
      expect(byVenue.data.map((e) => e.title)).toEqual(['Pop']);

      const byDate = await service.listEvents(orgId, source.id, {
        from: '2027-01-01',
        to: '2027-12-31',
      });
      expect(byDate.data.map((e) => e.title)).toEqual(['Late']);

      const all = await service.listEvents(orgId, source.id, { includeGone: true, limit: 10 });
      expect(all.data).toHaveLength(4);

      const current = await service.listEvents(orgId, source.id, {});
      expect(current.data.map((e) => e.title)).not.toContain('Gone');
    });

    it('pages through the pool and counts every match, keeping the filters', async () => {
      const source = await seedContentSource(db, orgId);
      for (let day = 1; day <= 5; day++) {
        const date = `2026-11-0${day}`;
        await seedEvent(source.id, orgId, {
          title: `Hirsch ${day}`,
          venue: 'Hirsch',
          eventDate: date,
          startsAt: new Date(`${date}T19:00:00Z`),
        });
      }
      await seedEvent(source.id, orgId, { title: 'Elsewhere', venue: 'Z-Bau' });

      const first = await service.listEvents(orgId, source.id, { venues: ['Hirsch'], limit: 2 });
      const last = await service.listEvents(orgId, source.id, {
        venues: ['Hirsch'],
        limit: 2,
        offset: 4,
      });

      expect(first).toMatchObject({ total: 5 });
      expect(first.data.map((e) => e.title)).toEqual(['Hirsch 1', 'Hirsch 2']);
      expect(last.data.map((e) => e.title)).toEqual(['Hirsch 5']);
      expect(last.total).toBe(5);
    });

    it('filters and labels venues by their canonical name, keeping the raw one', async () => {
      const source = await seedContentSource(db, orgId, {
        venueAliases: [
          { raw: 'Der Hirsch', canonical: 'Hirsch' },
          { raw: 'Z-Bau', canonical: 'Z-Bau Nürnberg' },
        ],
      });
      await seedEvent(source.id, orgId, { title: 'A', venue: 'Hirsch' });
      await seedEvent(source.id, orgId, { title: 'B', venue: 'Der Hirsch' });
      await seedEvent(source.id, orgId, { title: 'C', venue: 'Z-Bau' });

      const hirsch = await service.listEvents(orgId, source.id, { venues: ['Hirsch'] });
      const zbauRaw = await service.listEvents(orgId, source.id, { venues: ['Z-Bau'] });

      expect(hirsch.total).toBe(2);
      expect(hirsch.data.map((e) => [e.title, e.venue, e.venueCanonical])).toEqual([
        ['A', 'Hirsch', 'Hirsch'],
        ['B', 'Der Hirsch', 'Hirsch'],
      ]);
      // An aliased raw name is no filter value of its own any more.
      expect(zbauRaw.total).toBe(0);
    });

    it('lists the raw venues of current events with their canonical name', async () => {
      const source = await seedContentSource(db, orgId, {
        venueAliases: [{ raw: 'Der Hirsch', canonical: 'Hirsch' }],
      });
      await seedEvent(source.id, orgId, { venue: 'Hirsch' });
      await seedEvent(source.id, orgId, { venue: 'Hirsch' });
      await seedEvent(source.id, orgId, { venue: 'Der Hirsch' });
      await seedEvent(source.id, orgId, { venue: '' });
      await seedEvent(source.id, orgId, { venue: 'Gone', goneAt: new Date() });

      await expect(service.listVenues(orgId, source.id)).resolves.toEqual([
        { name: 'Der Hirsch', canonical: 'Hirsch', events: 1 },
        { name: 'Hirsch', canonical: 'Hirsch', events: 2 },
      ]);
    });

    it('returns an empty pool without querying slides', async () => {
      const source = await seedContentSource(db, orgId);

      await expect(service.listEvents(orgId, source.id, {})).resolves.toEqual({
        data: [],
        total: 0,
      });
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
      expect(pool[0].venueCanonical).toBe('Löwensaal');
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

    it('lists only canonical venue facets, per source aliases', async () => {
      const a = await seedContentSource(db, orgId, {
        venueAliases: [{ raw: 'Der Hirsch', canonical: 'Hirsch' }],
      });
      const b = await seedContentSource(db, orgId);
      await seedEvent(a.id, orgId, { venue: 'Hirsch' });
      await seedEvent(a.id, orgId, { venue: 'Der Hirsch' });
      // Another source without the alias keeps its own spelling.
      await seedEvent(b.id, orgId, { venue: 'Der Hirsch' });

      await expect(service.facets(orgId, { sourceIds: [a.id] })).resolves.toMatchObject({
        venues: ['Hirsch'],
      });
      await expect(service.facets(orgId, {})).resolves.toMatchObject({
        venues: ['Der Hirsch', 'Hirsch'],
      });
    });
  });
});
