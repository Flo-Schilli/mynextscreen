import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { asc, eq } from 'drizzle-orm';
import {
  contentSources,
  contents,
  eventScheduleRules,
  organisations,
  playlistItems,
  playlists,
  sourceEventSlides,
  sourceEvents,
  type ContentSource,
  type Playlist,
} from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import { seedContentSource } from '../test/content-source-seed';
import { ContentType } from '../content/content-type.enum';
import type { ContentService } from '../content/content.service';
import { ContentSourceService } from '../content-source/content-source.service';
import { ContentSourceAdapterRegistry } from '../content-source/adapter.registry';
import { ConcertbueroFrankenAdapter } from '../content-source/adapters/concertbuero-franken.adapter';
import {
  ContentSourceRemovedEvent,
  ContentSourceSyncedEvent,
  ContentSourceVenueAliasesUpdatedEvent,
} from '../content-source/content-source.constants';
import { AUDIT_PLAYLIST_RESOLVED, AUDIT_PLAYLIST_RULE_UPDATED } from '../audit-log/audit.events';
import { PlaylistService } from './playlist.service';
import { PlaylistRuleService } from './playlist-rule.service';
import { PlaylistRuleDto, toPlaylistRule } from './dto/playlist-rule.dto';
import { PlaylistKind } from './playlist-kind.enum';
import {
  PLAYLIST_RULE_CHANGED,
  PLAYLIST_UPDATED,
  PlaylistResolveRequestedEvent,
} from './playlist.event';
import { TransitionType } from './transition-type.enum';

describe('PlaylistRuleService', () => {
  let db: DrizzleDB;
  let emit: jest.Mock;
  let queue: { add: jest.Mock; getJob: jest.Mock };
  let sourceService: ContentSourceService;
  let service: PlaylistRuleService;
  let orgId: string;
  let otherOrgId: string;
  let source: ContentSource;

  // 2026-11-10 12:00 in Berlin.
  const noon = new Date('2026-11-10T11:00:00Z');

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    emit = jest.fn();
    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job' }),
      getJob: jest.fn().mockResolvedValue(undefined),
    };
    const emitter = { emit } as unknown as EventEmitter2;
    sourceService = new ContentSourceService(
      db,
      {} as Queue,
      new ContentSourceAdapterRegistry(new ConcertbueroFrankenAdapter()),
      {} as ContentService,
      emitter,
    );
    service = new PlaylistRuleService(
      db,
      queue as unknown as Queue,
      new PlaylistService(db, emitter),
      sourceService,
      emitter,
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
    source = await seedContentSource(db, orgId, { formats: ['1920x1080', '1080x1920'] });
  });

  function ruleDto(overrides: Record<string, unknown> = {}): PlaylistRuleDto {
    return plainToInstance(PlaylistRuleDto, {
      sourceIds: [source.id],
      format: '1920x1080',
      ...overrides,
    });
  }

  /** Seeds an event with a landscape slide; returns the slide's content id. */
  async function seedEventWithSlide(
    values: Partial<typeof sourceEvents.$inferInsert> = {},
  ): Promise<{ eventId: string; contentId: string; contentUpdatedAt: Date }> {
    const eventDate = values.eventDate ?? '2026-11-12';
    const [event] = await db
      .insert(sourceEvents)
      .values({
        organisationId: orgId,
        sourceId: source.id,
        externalId: `ext-${Math.random()}`,
        title: 'ASP',
        eventDate,
        startsAt: new Date(`${eventDate}T19:00:00Z`),
        venue: 'Löwensaal',
        genres: ['Metal'],
        dataHash: 'h',
        ...values,
      })
      .returning();
    const [content] = await db
      .insert(contents)
      .values({
        organisationId: orgId,
        title: event.title,
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
    return { eventId: event.id, contentId: content.id, contentUpdatedAt: content.updatedAt };
  }

  async function seedDynamic(
    overrides: Partial<typeof playlists.$inferInsert> = {},
    rule: Record<string, unknown> = {},
  ): Promise<Playlist> {
    const [playlist] = await db
      .insert(playlists)
      .values({
        organisationId: orgId,
        name: 'Metal',
        kind: PlaylistKind.Dynamic,
        rule: toPlaylistRule(ruleDto(rule)),
        ...overrides,
      })
      .returning();
    return playlist;
  }

  async function itemsOf(playlistId: string) {
    return db
      .select()
      .from(playlistItems)
      .where(eq(playlistItems.playlistId, playlistId))
      .orderBy(asc(playlistItems.position));
  }

  async function playlistRow(id: string): Promise<Playlist> {
    const [row] = await db.select().from(playlists).where(eq(playlists.id, id));
    return row;
  }

  describe('preview', () => {
    it('lists the matching events with their slide and expiry', async () => {
      jest.useFakeTimers({ now: noon, doNotFake: ['nextTick', 'setImmediate'] });
      try {
        const metal = await seedEventWithSlide({ title: 'Metal Band', eventDate: '2026-11-12' });
        await seedEventWithSlide({ title: 'Pop Band', genres: ['Pop'] });
        await seedEventWithSlide({ title: 'Past', eventDate: '2026-11-08' });

        const result = await service.preview(
          orgId,
          ruleDto({ genres: { match: 'any', values: ['Metal'] }, itemDurationSeconds: 7 }),
        );

        expect(result.totalDurationSeconds).toBe(7);
        expect(result.items).toEqual([
          expect.objectContaining({
            sourceEventId: metal.eventId,
            contentId: metal.contentId,
            contentUpdatedAt: metal.contentUpdatedAt.toISOString(),
            title: 'Metal Band',
            venue: 'Löwensaal',
            // 2026-11-13 00:00 CET + 4 h.
            expiresAt: '2026-11-13T03:00:00.000Z',
          }),
        ]);
      } finally {
        jest.useRealTimers();
      }
    });

    it("applies the source's venue aliases and shows both names", async () => {
      jest.useFakeTimers({ now: noon, doNotFake: ['nextTick', 'setImmediate'] });
      try {
        await db
          .update(contentSources)
          .set({ venueAliases: [{ raw: 'Der Hirsch', canonical: 'Hirsch' }] })
          .where(eq(contentSources.id, source.id));
        await seedEventWithSlide({ title: 'Raw', venue: 'Hirsch' });
        await seedEventWithSlide({
          title: 'Aliased',
          venue: 'Der Hirsch',
          eventDate: '2026-11-13',
        });
        await seedEventWithSlide({ title: 'Elsewhere', venue: 'Z-Bau' });

        const result = await service.preview(orgId, ruleDto({ venues: ['Hirsch'] }));

        expect(result.items.map((item) => [item.title, item.venue, item.venueCanonical])).toEqual([
          ['Raw', 'Hirsch', 'Hirsch'],
          ['Aliased', 'Der Hirsch', 'Hirsch'],
        ]);
      } finally {
        jest.useRealTimers();
      }
    });

    it('rejects a source of another organisation', async () => {
      const foreign = await seedContentSource(db, otherOrgId);

      await expect(
        service.preview(orgId, ruleDto({ sourceIds: [source.id, foreign.id] })),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a format none of the sources renders', async () => {
      await expect(service.preview(orgId, ruleDto({ format: '3840x2160' }))).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createDynamic', () => {
    it('creates the playlist and materialises the rule with its item settings', async () => {
      const { contentId } = await seedEventWithSlide({ eventDate: '2099-01-01' });

      const created = await service.createDynamic(orgId, {
        name: 'Metal',
        kind: PlaylistKind.Dynamic,
        rule: ruleDto({
          itemDurationSeconds: 12,
          transition: TransitionType.SlideLeft,
          transitionDurationMs: 800,
        }),
      });

      expect(created.kind).toBe(PlaylistKind.Dynamic);
      const items = await itemsOf(created.id);
      expect(items).toEqual([
        expect.objectContaining({
          contentId,
          position: 0,
          durationSeconds: 12,
          transition: TransitionType.SlideLeft,
          transitionDurationMs: 800,
        }),
      ]);
      const row = await playlistRow(created.id);
      expect(row.lastResolvedAt).not.toBeNull();
      expect(row.nextResolveAt).not.toBeNull();
    });

    it('rejects a missing rule and unknown sources before creating anything', async () => {
      await expect(
        service.createDynamic(orgId, { name: 'X', kind: PlaylistKind.Dynamic }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createDynamic(orgId, {
          name: 'X',
          kind: PlaylistKind.Dynamic,
          rule: ruleDto({ sourceIds: ['990e8400-e29b-41d4-a716-446655440000'] }),
        }),
      ).rejects.toThrow(BadRequestException);
      expect(await db.select().from(playlists)).toHaveLength(0);
    });

    it('still returns the playlist when the first resolve fails', async () => {
      jest.spyOn(sourceService, 'findPool').mockRejectedValueOnce(new Error('db blip'));

      const created = await service.createDynamic(orgId, {
        name: 'Metal',
        kind: PlaylistKind.Dynamic,
        rule: ruleDto(),
      });

      expect(created.id).toBeDefined();
      expect((await playlistRow(created.id)).nextResolveAt).not.toBeNull();
    });
  });

  describe('resolve', () => {
    it('pushes and audits only real changes', async () => {
      const kept = await seedEventWithSlide({ eventDate: '2026-11-12', title: 'A' });
      const cancelled = await seedEventWithSlide({ eventDate: '2026-11-13', title: 'B' });
      const playlist = await seedDynamic();

      const first = await service.resolve(playlist.id, noon);
      expect(first).toMatchObject({ changed: true, itemCount: 2 });
      expect(emit).toHaveBeenCalledWith(AUDIT_PLAYLIST_RESOLVED, expect.anything());

      emit.mockClear();
      const second = await service.resolve(playlist.id, noon);
      expect(second).toMatchObject({ changed: false, itemCount: 2 });
      expect(emit).not.toHaveBeenCalled();

      await db
        .update(sourceEvents)
        .set({ cancelled: true })
        .where(eq(sourceEvents.id, cancelled.eventId));
      const third = await service.resolve(playlist.id, noon);
      expect(third).toMatchObject({ changed: true, itemCount: 1 });
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: playlist.id }),
      );
      expect((await itemsOf(playlist.id)).map((item) => item.contentId)).toEqual([kept.contentId]);
    });

    it('keeps the resolves of a genre variant out of the audit log', async () => {
      await seedEventWithSlide();
      const base = await seedDynamic();
      const [rule] = await db
        .insert(eventScheduleRules)
        .values({
          organisationId: orgId,
          sourceId: source.id,
          name: 'Abend',
          venues: ['Löwensaal'],
          playlistId: base.id,
          windowStart: '18:00',
          windowEnd: '23:00',
        })
        .returning();
      const variant = await seedDynamic({ managedByRuleId: rule.id, variantKey: '["Metal"]' });

      const outcome = await service.resolve(variant.id, noon);

      expect(outcome).toMatchObject({ changed: true, itemCount: 1 });
      expect(emit).not.toHaveBeenCalledWith(AUDIT_PLAYLIST_RESOLVED, expect.anything());
    });

    it('drops an event once its day plus grace hours has passed', async () => {
      await seedEventWithSlide({ eventDate: '2026-11-10' });
      const playlist = await seedDynamic({}, { graceHours: 2 });

      await service.resolve(playlist.id, new Date('2026-11-11T00:59:00Z')); // 01:59 local
      expect(await itemsOf(playlist.id)).toHaveLength(1);

      await service.resolve(playlist.id, new Date('2026-11-11T01:00:00Z')); // 02:00 local
      expect(await itemsOf(playlist.id)).toHaveLength(0);
    });

    it('schedules the next resolve at the refresh interval or an earlier expiry', async () => {
      const playlist = await seedDynamic({}, { refreshIntervalMinutes: 60, graceHours: 0 });

      const empty = await service.resolve(playlist.id, noon);
      expect(empty?.nextResolveAt).toEqual(new Date('2026-11-10T12:00:00Z'));

      await seedEventWithSlide({ eventDate: '2026-11-10' });
      const lateEvening = new Date('2026-11-10T22:30:00Z'); // 23:30 local
      const outcome = await service.resolve(playlist.id, lateEvening);
      // Expires at local midnight, before the hourly refresh.
      expect(outcome?.nextResolveAt).toEqual(new Date('2026-11-10T23:00:00Z'));
      const row = await playlistRow(playlist.id);
      expect(row.nextResolveAt).toEqual(new Date('2026-11-10T23:00:00Z'));
      expect(row.lastResolvedAt).toEqual(lateEvening);
    });

    it('ignores static and missing playlists', async () => {
      const [staticPlaylist] = await db
        .insert(playlists)
        .values({ organisationId: orgId, name: 'Loop' })
        .returning();

      await expect(service.resolve(staticPlaylist.id)).resolves.toBeNull();
      await expect(service.resolve('990e8400-e29b-41d4-a716-446655440000')).resolves.toBeNull();
    });

    it('discards the result when the rule changed while resolving', async () => {
      await seedEventWithSlide({ eventDate: '2026-11-12', venue: 'Hirsch' });
      const playlist = await seedDynamic(
        { nextResolveAt: new Date('2026-11-10T10:00:00Z') },
        { venues: ['Hirsch'] },
      );
      const findPool = sourceService.findPool.bind(sourceService);
      jest.spyOn(sourceService, 'findPool').mockImplementationOnce(async (...args) => {
        await db
          .update(playlists)
          .set({ rule: toPlaylistRule(ruleDto({ venues: ['Z-Bau'] })) })
          .where(eq(playlists.id, playlist.id));
        return findPool(...args);
      });

      await expect(service.resolve(playlist.id, noon)).resolves.toBeNull();

      expect(await itemsOf(playlist.id)).toEqual([]);
      const row = await playlistRow(playlist.id);
      expect(row.lastResolvedAt).toBeNull();
      expect(row.nextResolveAt!.getTime()).toBeLessThanOrEqual(noon.getTime());
    });

    it('keeps a next resolve that was moved forward while resolving', async () => {
      const playlist = await seedDynamic({}, { refreshIntervalMinutes: 60 });
      const requested = new Date('2026-11-10T11:00:30Z');
      const findPool = sourceService.findPool.bind(sourceService);
      jest.spyOn(sourceService, 'findPool').mockImplementationOnce(async (...args) => {
        await db
          .update(playlists)
          .set({ nextResolveAt: requested })
          .where(eq(playlists.id, playlist.id));
        return findPool(...args);
      });

      await service.resolve(playlist.id, noon);

      const row = await playlistRow(playlist.id);
      expect(row.nextResolveAt).toEqual(requested);
      expect(row.lastResolvedAt).toEqual(noon);
    });

    it('backs off to the refresh interval and rethrows on failure', async () => {
      const playlist = await seedDynamic({}, { refreshIntervalMinutes: 30 });
      jest.spyOn(sourceService, 'findPool').mockRejectedValueOnce(new Error('db blip'));

      await expect(service.resolve(playlist.id, noon)).rejects.toThrow('db blip');

      expect((await playlistRow(playlist.id)).nextResolveAt).toEqual(
        new Date('2026-11-10T11:30:00Z'),
      );
    });
  });

  describe('updateRule', () => {
    it('leaves the playlist due when the immediate resolve fails', async () => {
      const playlist = await seedDynamic({ nextResolveAt: new Date('2099-01-01T00:00:00Z') });
      jest.spyOn(sourceService, 'findPool').mockRejectedValueOnce(new Error('db blip'));
      const before = Date.now();

      await service.updateRule(orgId, playlist.id, ruleDto({ venues: ['Hirsch'] }), null);

      const { nextResolveAt } = await playlistRow(playlist.id);
      expect(nextResolveAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(nextResolveAt!.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('stores the rule, audits and recomputes at once', async () => {
      await seedEventWithSlide({ eventDate: '2099-01-01', venue: 'Hirsch' });
      await seedEventWithSlide({ eventDate: '2099-01-02', venue: 'Z-Bau' });
      const playlist = await seedDynamic();
      const userId = '880e8400-e29b-41d4-a716-446655440000';

      const updated = await service.updateRule(
        orgId,
        playlist.id,
        ruleDto({ venues: ['Hirsch'] }),
        userId,
      );

      expect(updated.rule).toMatchObject({ venues: ['Hirsch'] });
      expect(await itemsOf(playlist.id)).toHaveLength(1);
      expect(emit).toHaveBeenCalledWith(
        AUDIT_PLAYLIST_RULE_UPDATED,
        expect.objectContaining({ playlistId: playlist.id, userId }),
      );
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_RULE_CHANGED,
        expect.objectContaining({ playlistId: playlist.id, organisationId: orgId }),
      );
    });

    it('answers 409 for a static playlist and 404 for a foreign one', async () => {
      const [staticPlaylist] = await db
        .insert(playlists)
        .values({ organisationId: orgId, name: 'Loop' })
        .returning();
      const foreign = await seedDynamic({ organisationId: otherOrgId });

      await expect(service.updateRule(orgId, staticPlaylist.id, ruleDto(), null)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.updateRule(orgId, foreign.id, ruleDto(), null)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('queueing', () => {
    it('enqueues with a dash job id that does not linger', async () => {
      await service.enqueueResolve('p1');

      expect(queue.add).toHaveBeenCalledWith(
        'resolve',
        { playlistId: 'p1' },
        { jobId: 'resolve-p1', removeOnComplete: true, removeOnFail: true },
      );
    });

    it('marks the playlist due when its resolve job is already running', async () => {
      const playlist = await seedDynamic({ nextResolveAt: new Date('2099-01-01T00:00:00Z') });
      queue.getJob.mockResolvedValue({ isActive: jest.fn().mockResolvedValue(true) });
      const before = Date.now();

      await service.enqueueResolve(playlist.id);

      expect(queue.getJob).toHaveBeenCalledWith(`resolve-${playlist.id}`);
      const { nextResolveAt } = await playlistRow(playlist.id);
      expect(nextResolveAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(nextResolveAt!.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('leaves a running playlist alone when the scheduler queues it', async () => {
      const due = new Date('2026-01-01T00:00:00Z');
      const playlist = await seedDynamic({ nextResolveAt: due });
      queue.getJob.mockResolvedValue({ isActive: jest.fn().mockResolvedValue(true) });

      await service.enqueueScheduledResolve(playlist.id);

      expect((await playlistRow(playlist.id)).nextResolveAt).toEqual(due);
      expect(queue.add).toHaveBeenCalledWith(
        'resolve',
        { playlistId: playlist.id },
        { jobId: `resolve-${playlist.id}`, removeOnComplete: true, removeOnFail: true },
      );
    });

    it('leaves the schedule alone when the job is only waiting', async () => {
      const later = new Date('2099-01-01T00:00:00Z');
      const playlist = await seedDynamic({ nextResolveAt: later });
      queue.getJob.mockResolvedValue({ isActive: jest.fn().mockResolvedValue(false) });

      await service.enqueueResolve(playlist.id);

      expect((await playlistRow(playlist.id)).nextResolveAt).toEqual(later);
      expect(queue.add).toHaveBeenCalledTimes(1);
    });

    it('finds dynamic playlists that are due or never resolved', async () => {
      const never = await seedDynamic();
      const due = await seedDynamic({ nextResolveAt: new Date('2026-11-10T10:00:00Z') });
      await seedDynamic({ nextResolveAt: new Date('2026-11-10T12:00:00Z') });
      await db.insert(playlists).values({ organisationId: orgId, name: 'Loop' });

      const ids = await service.findDuePlaylistIds(noon);

      expect(ids.sort()).toEqual([never.id, due.id].sort());
    });

    it('enqueues the dynamic playlists fed by a synced source', async () => {
      const other = await seedContentSource(db, orgId);
      const fed = await seedDynamic();
      await seedDynamic({}, { sourceIds: [other.id] });
      await db.insert(playlists).values({ organisationId: orgId, name: 'Loop' });

      await service.onSourceSynced(new ContentSourceSyncedEvent(source.id, orgId));

      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(queue.add).toHaveBeenCalledWith(
        'resolve',
        { playlistId: fed.id },
        expect.objectContaining({ jobId: `resolve-${fed.id}` }),
      );
    });

    it('enqueues the dynamic playlists fed by a source whose aliases changed', async () => {
      const fed = await seedDynamic();

      await service.onVenueAliasesUpdated(
        new ContentSourceVenueAliasesUpdatedEvent(source.id, orgId),
      );

      expect(queue.add).toHaveBeenCalledWith(
        'resolve',
        { playlistId: fed.id },
        expect.objectContaining({ jobId: `resolve-${fed.id}` }),
      );
    });

    it('drops a removed source from rules and re-resolves those playlists', async () => {
      const other = await seedContentSource(db, orgId);
      const mixed = await seedDynamic({}, { sourceIds: [source.id, other.id] });
      const only = await seedDynamic();
      const unrelated = await seedDynamic({}, { sourceIds: [other.id] });

      await service.onSourceRemoved(new ContentSourceRemovedEvent(source.id, orgId));

      expect((await playlistRow(mixed.id)).rule?.sourceIds).toEqual([other.id]);
      expect((await playlistRow(only.id)).rule?.sourceIds).toEqual([]);
      expect((await playlistRow(unrelated.id)).rule?.sourceIds).toEqual([other.id]);
      const queued = queue.add.mock.calls.map(([, data]) => data.playlistId);
      expect(queued.sort()).toEqual([mixed.id, only.id].sort());
    });

    it('swallows a failure on source removal', async () => {
      await seedDynamic();
      queue.add.mockRejectedValue(new Error('redis down'));

      await expect(
        service.onSourceRemoved(new ContentSourceRemovedEvent(source.id, orgId)),
      ).resolves.toBeUndefined();
    });

    it('enqueues a playlist on request and swallows a queue failure', async () => {
      await service.onResolveRequested(new PlaylistResolveRequestedEvent('p1'));
      expect(queue.add).toHaveBeenCalledWith(
        expect.anything(),
        { playlistId: 'p1' },
        expect.objectContaining({ jobId: 'resolve-p1' }),
      );

      queue.add.mockRejectedValue(new Error('redis down'));
      await expect(
        service.onResolveRequested(new PlaylistResolveRequestedEvent('p1')),
      ).resolves.toBeUndefined();
    });

    it('swallows a queue failure on sync events', async () => {
      await seedDynamic();
      queue.add.mockRejectedValue(new Error('redis down'));

      await expect(
        service.onSourceSynced(new ContentSourceSyncedEvent(source.id, orgId)),
      ).resolves.toBeUndefined();
    });
  });
});
