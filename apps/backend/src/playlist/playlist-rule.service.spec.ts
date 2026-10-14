import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { asc, eq } from 'drizzle-orm';
import {
  contents,
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
import { ContentSourceSyncedEvent } from '../content-source/content-source.constants';
import { AUDIT_PLAYLIST_RESOLVED, AUDIT_PLAYLIST_RULE_UPDATED } from '../audit-log/audit.events';
import { PlaylistService } from './playlist.service';
import { PlaylistRuleService } from './playlist-rule.service';
import { PlaylistRuleDto, toPlaylistRule } from './dto/playlist-rule.dto';
import { PlaylistKind } from './playlist-kind.enum';
import { PLAYLIST_UPDATED } from './playlist.event';
import { TransitionType } from './transition-type.enum';

describe('PlaylistRuleService', () => {
  let db: DrizzleDB;
  let emit: jest.Mock;
  let queue: { add: jest.Mock };
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
    queue = { add: jest.fn().mockResolvedValue({ id: 'job' }) };
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
  ): Promise<{ eventId: string; contentId: string }> {
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
    return { eventId: event.id, contentId: content.id };
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

    it('swallows a queue failure on sync events', async () => {
      await seedDynamic();
      queue.add.mockRejectedValue(new Error('redis down'));

      await expect(
        service.onSourceSynced(new ContentSourceSyncedEvent(source.id, orgId)),
      ).resolves.toBeUndefined();
    });
  });
});
