import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  contentSources,
  organisations,
  playlists,
  scheduleEntries,
  screenGroups,
  screens,
  sliceJobs,
  sourceEvents,
  type ContentSource,
  type Organisation,
  type Playlist,
  type Screen,
  type ScreenGroup,
  type SourceEvent,
} from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import { SLICE_CONTENT_QUEUE, SliceEnqueueService, SliceStatusService } from '../slice-content';
import { ScheduleService } from '../schedule/schedule.service';
import {
  GROUP_SCHEDULE_CHANGED,
  SCHEDULE_ENTRIES_EDITED,
  SCHEDULE_ENTRY_CHANGED,
} from '../schedule/schedule.event';
import {
  AUDIT_EVENT_SCHEDULE_RULE_RECONCILED,
  AUDIT_EVENT_SCHEDULE_RULE_UPDATED,
} from '../audit-log/audit.events';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { PlaylistKind } from '../playlist/playlist-kind.enum';
import { TransitionType } from '../playlist/transition-type.enum';
import type { PlaylistRule } from '../playlist/playlist-rule.types';
import { PLAYLIST_RESOLVE_REQUESTED } from '../playlist/playlist.event';
import { EventScheduleReconcileService } from './event-schedule-reconcile.service';
import { EventScheduleRuleService } from './event-schedule-rule.service';
import type { CreateEventScheduleRuleDto } from './dto';

const TZ = 'Europe/Berlin';
// 2026-11-05 18:00–23:30 Berlin (UTC+1).
const SLOT_START = new Date('2026-11-05T17:00:00Z');
const SLOT_END = new Date('2026-11-05T22:30:00Z');

describe('Event schedule rules', () => {
  let db: DrizzleDB;
  let emit: jest.Mock;
  let sliceAdd: jest.Mock;
  let rules: EventScheduleRuleService;
  let reconcile: EventScheduleReconcileService;
  let schedule: ScheduleService;

  let org: Organisation;
  let source: ContentSource;
  let playlist: Playlist;
  let screen: Screen;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    jest.useFakeTimers({
      now: new Date('2026-11-01T12:00:00Z'),
      doNotFake: ['nextTick', 'setImmediate'],
    });
    emit = jest.fn();
    sliceAdd = jest.fn().mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventScheduleRuleService,
        EventScheduleReconcileService,
        ScheduleService,
        SliceEnqueueService,
        SliceStatusService,
        { provide: DRIZZLE, useValue: db },
        { provide: getQueueToken(SLICE_CONTENT_QUEUE), useValue: { add: sliceAdd } },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    rules = module.get(EventScheduleRuleService);
    reconcile = module.get(EventScheduleReconcileService);
    schedule = module.get(ScheduleService);

    [org] = await db.insert(organisations).values({ name: 'Venue', timeZone: TZ }).returning();
    [source] = await db
      .insert(contentSources)
      .values({
        organisationId: org.id,
        name: 'CBF',
        adapterType: 'concertbuero-franken',
        formats: ['1920x1080'],
        style: { background: 'black', accentColor: '#ff0000' },
        venueAliases: [{ raw: 'Der Hirsch', canonical: 'Hirsch' }],
      })
      .returning();
    [playlist] = await db
      .insert(playlists)
      .values({ organisationId: org.id, name: 'Konzertabend' })
      .returning();
    screen = await seedScreen('Foyer');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function seedScreen(name: string): Promise<Screen> {
    const [row] = await db
      .insert(screens)
      .values({
        organisationId: org.id,
        name,
        resolution: '1920x1080',
        location: 'Lobby',
        apiKeyHash: `hash-${name}-${Math.random()}`,
      })
      .returning();
    return row;
  }

  async function seedGroup(mode = ScreenGroupMode.Mirror): Promise<ScreenGroup> {
    const [row] = await db
      .insert(screenGroups)
      .values({ organisationId: org.id, name: 'Wall', mode })
      .returning();
    return row;
  }

  async function seedEvent(overrides: Partial<SourceEvent> = {}): Promise<SourceEvent> {
    const eventDate = overrides.eventDate ?? '2026-11-05';
    const [row] = await db
      .insert(sourceEvents)
      .values({
        organisationId: org.id,
        sourceId: source.id,
        externalId: `ext-${Math.random()}`,
        title: 'Band',
        eventDate,
        startTime: '20:00',
        startsAt: new Date(`${eventDate}T19:00:00Z`),
        venue: 'Hirsch',
        dataHash: 'h',
        ...overrides,
      })
      .returning();
    return row;
  }

  function dto(overrides: Partial<CreateEventScheduleRuleDto> = {}): CreateEventScheduleRuleDto {
    return {
      name: 'Hirsch-Abend',
      venues: ['Hirsch'],
      playlistId: playlist.id,
      windowStart: '18:00',
      windowEnd: '23:30',
      screenIds: [screen.id],
      groupIds: [],
      ...overrides,
    };
  }

  async function managedEntries() {
    return db.select().from(scheduleEntries).where(eq(scheduleEntries.organisationId, org.id));
  }

  async function seedManual(
    target: { screenId?: string; groupId?: string },
    start: Date,
    end: Date,
  ) {
    return schedule.create(org.id, {
      ...target,
      playlistId: playlist.id,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
  }

  describe('creating a rule', () => {
    it('schedules the playlist in the window on each event day', async () => {
      await seedEvent();
      await seedEvent({ eventDate: '2026-11-12', venue: 'Der Hirsch', title: 'Other band' });
      await seedEvent({ eventDate: '2026-11-13', venue: 'Löwensaal' });

      const rule = await rules.create(org.id, source.id, dto(), 'user-1');

      const entries = await managedEntries();
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.managedByRuleId === rule.id)).toBe(true);
      const first = entries.find((e) => e.startTime.getTime() === SLOT_START.getTime());
      expect(first).toMatchObject({
        screenId: screen.id,
        playlistId: playlist.id,
        endTime: SLOT_END,
        name: 'Hirsch-Abend: Band',
      });
      expect(rule.lastReconcileSummary).toMatchObject({ created: 2, conflicts: [] });
      expect(rule.screenIds).toEqual([screen.id]);
    });

    it('pushes the change to the screens and records one audit entry', async () => {
      await seedEvent();

      await rules.create(org.id, source.id, dto(), 'user-1');

      expect(emit).toHaveBeenCalledWith(
        SCHEDULE_ENTRY_CHANGED,
        expect.objectContaining({ screenId: screen.id }),
      );
      expect(emit).toHaveBeenCalledWith(
        AUDIT_EVENT_SCHEDULE_RULE_RECONCILED,
        expect.objectContaining({
          userId: 'user-1',
          details: expect.objectContaining({ created: 1 }),
        }),
      );
    });

    it('schedules onto groups', async () => {
      const group = await seedGroup();
      await seedEvent();

      await rules.create(org.id, source.id, dto({ screenIds: [], groupIds: [group.id] }), null);

      const [entry] = await managedEntries();
      expect(entry.groupId).toBe(group.id);
      expect(emit).toHaveBeenCalledWith(
        GROUP_SCHEDULE_CHANGED,
        expect.objectContaining({ groupId: group.id }),
      );
    });

    it('rejects a rule without targets', async () => {
      await expect(rules.create(org.id, source.id, dto({ screenIds: [] }), null)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects targets, playlists and sources of another organisation', async () => {
      const [other] = await db
        .insert(organisations)
        .values({ name: 'Other', timeZone: TZ })
        .returning();
      const [foreignScreen] = await db
        .insert(screens)
        .values({
          organisationId: other.id,
          name: 'X',
          resolution: '1920x1080',
          location: 'Lobby',
          apiKeyHash: 'foreign',
        })
        .returning();
      const [foreignPlaylist] = await db
        .insert(playlists)
        .values({ organisationId: other.id, name: 'X' })
        .returning();

      await expect(
        rules.create(org.id, source.id, dto({ screenIds: [foreignScreen.id] }), null),
      ).rejects.toThrow(NotFoundException);
      await expect(
        rules.create(org.id, source.id, dto({ playlistId: foreignPlaylist.id }), null),
      ).rejects.toThrow(NotFoundException);
      await expect(rules.create(other.id, source.id, dto(), null)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reconciling', () => {
    it('is idempotent', async () => {
      await seedEvent();
      const rule = await rules.create(org.id, source.id, dto(), null);
      emit.mockClear();

      const summary = await reconcile.reconcile(rule.id);

      expect(summary).toEqual({ created: 0, updated: 0, removed: 0, conflicts: [] });
      expect(await managedEntries()).toHaveLength(1);
      expect(emit).not.toHaveBeenCalledWith(
        AUDIT_EVENT_SCHEDULE_RULE_RECONCILED,
        expect.anything(),
      );
    });

    it('moves entries when the window changes', async () => {
      await seedEvent();
      const rule = await rules.create(org.id, source.id, dto(), null);

      const updated = await rules.update(org.id, source.id, rule.id, { windowEnd: '01:00' }, null);

      const [entry] = await managedEntries();
      expect(entry.endTime).toEqual(new Date('2026-11-06T00:00:00Z'));
      expect(updated.lastReconcileSummary).toMatchObject({ updated: 1 });
    });

    it('removes the entry of a cancelled or vanished event', async () => {
      const event = await seedEvent();
      const rule = await rules.create(org.id, source.id, dto(), null);

      await db.update(sourceEvents).set({ cancelled: true }).where(eq(sourceEvents.id, event.id));
      const summary = await reconcile.reconcile(rule.id);

      expect(summary).toMatchObject({ removed: 1 });
      expect(await managedEntries()).toEqual([]);
    });

    it('keeps an ended entry as history and prunes it after the retention', async () => {
      await seedEvent();
      const rule = await rules.create(org.id, source.id, dto(), null);

      await reconcile.reconcile(rule.id, new Date('2026-11-10T00:00:00Z'));
      expect(await managedEntries()).toHaveLength(1);

      await reconcile.reconcile(rule.id, new Date('2026-11-25T00:00:00Z'));
      expect(await managedEntries()).toEqual([]);
    });

    it('removes upcoming entries of a disabled rule', async () => {
      await seedEvent();
      const rule = await rules.create(org.id, source.id, dto(), null);

      await rules.update(org.id, source.id, rule.id, { enabled: false }, null);

      expect(await managedEntries()).toEqual([]);
    });

    it('leaves out a slot a manual entry holds and reports the conflict', async () => {
      const event = await seedEvent();
      const manual = await seedManual(
        { screenId: screen.id },
        new Date('2026-11-05T21:00:00Z'),
        new Date('2026-11-05T23:00:00Z'),
      );

      const rule = await rules.create(org.id, source.id, dto(), null);

      const entries = await managedEntries();
      expect(entries.map((e) => e.id)).toEqual([manual.id]);
      expect(rule.lastReconcileSummary?.conflicts).toEqual([
        expect.objectContaining({
          sourceEventId: event.id,
          screenId: screen.id,
          blockingEntryId: manual.id,
          startTime: SLOT_START.toISOString(),
          endTime: SLOT_END.toISOString(),
          playlistId: playlist.id,
        }),
      ]);
    });

    it('checks group targets against manual group entries', async () => {
      const group = await seedGroup();
      await seedEvent();
      await seedManual({ groupId: group.id }, SLOT_START, SLOT_END);

      const rule = await rules.create(
        org.id,
        source.id,
        dto({ screenIds: [], groupIds: [group.id] }),
        null,
      );

      expect(rule.lastReconcileSummary?.conflicts).toHaveLength(1);
    });

    it('steps aside when a manual entry is created over a generated one', async () => {
      await seedEvent();
      const rule = await rules.create(org.id, source.id, dto(), null);

      const manual = await seedManual({ screenId: screen.id }, SLOT_START, SLOT_END);
      const summary = await reconcile.reconcile(rule.id);

      expect(summary).toMatchObject({ removed: 1 });
      expect((await managedEntries()).map((e) => e.id)).toEqual([manual.id]);
    });

    it('lets the rule that scheduled first keep the slot', async () => {
      await seedEvent();
      const first = await rules.create(org.id, source.id, dto({ name: 'First' }), null);
      const second = await rules.create(org.id, source.id, dto({ name: 'Second' }), null);

      const entries = await managedEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].managedByRuleId).toBe(first.id);
      expect(second.lastReconcileSummary?.conflicts).toHaveLength(1);
    });

    it('returns null for a rule that is gone', async () => {
      expect(await reconcile.reconcile('00000000-0000-0000-0000-000000000000')).toBeNull();
    });
  });

  describe('generated entries', () => {
    it('cannot be edited or deleted by hand', async () => {
      await seedEvent();
      await rules.create(org.id, source.id, dto(), null);
      const [entry] = await managedEntries();

      await expect(schedule.update(entry.id, org.id, { name: 'x' })).rejects.toThrow(
        ConflictException,
      );
      await expect(schedule.delete(entry.id, org.id)).rejects.toThrow(ConflictException);
    });

    it('never block a manual entry', async () => {
      await seedEvent();
      await rules.create(org.id, source.id, dto(), null);

      await expect(
        seedManual({ screenId: screen.id }, SLOT_START, SLOT_END),
      ).resolves.toBeDefined();
    });

    it('list the rule that made them', async () => {
      await seedEvent();
      const rule = await rules.create(org.id, source.id, dto(), null);

      const [listed] = await schedule.findByOrganisation(org.id, new Date(), new Date());

      expect(listed.managedByRule).toEqual({ id: rule.id, name: rule.name, sourceId: source.id });
      const [ofScreen] = await schedule.findByScreen(screen.id, org.id, new Date(), new Date());
      expect(ofScreen.managedByRule).toEqual(listed.managedByRule);
    });
  });

  describe('exclusions and preview', () => {
    it('drops an excluded event and takes it back in', async () => {
      const event = await seedEvent();
      const rule = await rules.create(org.id, source.id, dto(), null);

      await rules.setExcluded(org.id, source.id, rule.id, event.id, true, null);
      expect(await managedEntries()).toEqual([]);

      await rules.setExcluded(org.id, source.id, rule.id, event.id, false, null);
      expect(await managedEntries()).toHaveLength(1);
    });

    it('rejects excluding an event of another source', async () => {
      const rule = await rules.create(org.id, source.id, dto(), null);

      await expect(
        rules.setExcluded(
          org.id,
          source.id,
          rule.id,
          '00000000-0000-0000-0000-000000000000',
          true,
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('lists upcoming events with the status of each target', async () => {
      const other = await seedScreen('Bar');
      const scheduled = await seedEvent();
      const excluded = await seedEvent({ eventDate: '2026-11-12' });
      await seedManual({ screenId: other.id }, SLOT_START, SLOT_END);
      const rule = await rules.create(
        org.id,
        source.id,
        dto({ screenIds: [screen.id, other.id] }),
        null,
      );
      await rules.setExcluded(org.id, source.id, rule.id, excluded.id, true, null);

      const preview = await rules.preview(org.id, source.id, rule.id);

      expect(preview.map((item) => item.sourceEventId)).toEqual([scheduled.id, excluded.id]);
      expect(preview[0].targets).toEqual([
        { screenId: screen.id, groupId: null, status: 'scheduled' },
        { screenId: other.id, groupId: null, status: 'conflict' },
      ]);
      expect(preview[1]).toMatchObject({ excluded: true });
      expect(preview[1].targets.every((t) => t.status === 'excluded')).toBe(true);
    });
  });

  describe('deleting a rule', () => {
    it('removes its entries and tells the screens', async () => {
      await seedEvent();
      const rule = await rules.create(org.id, source.id, dto(), null);
      emit.mockClear();

      await rules.remove(org.id, source.id, rule.id, null);

      expect(await managedEntries()).toEqual([]);
      expect(emit).toHaveBeenCalledWith(
        SCHEDULE_ENTRY_CHANGED,
        expect.objectContaining({ screenId: screen.id }),
      );
      await expect(rules.findOne(org.id, source.id, rule.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('lookups for the listener', () => {
    it('finds rules by source, organisation, target and in total', async () => {
      const group = await seedGroup();
      const rule = await rules.create(org.id, source.id, dto({ groupIds: [group.id] }), null);

      expect(await reconcile.ruleIdsOfSource(source.id)).toEqual([rule.id]);
      expect(await reconcile.ruleIdsOfOrganisation(org.id)).toEqual([rule.id]);
      expect(await reconcile.ruleIdsTargeting([{ screenId: screen.id, groupId: null }])).toEqual([
        rule.id,
      ]);
      expect(await reconcile.ruleIdsTargeting([{ screenId: null, groupId: group.id }])).toEqual([
        rule.id,
      ]);
      expect(await reconcile.ruleIdsTargeting([])).toEqual([]);
      expect(await reconcile.allRuleIds()).toEqual([rule.id]);
      expect(await rules.findAll(org.id, source.id)).toHaveLength(1);
    });
  });

  describe('freed slots', () => {
    it('go to the waiting rule when the rule holding them is deleted', async () => {
      await seedEvent();
      const first = await rules.create(org.id, source.id, dto({ name: 'First' }), null);
      const second = await rules.create(org.id, source.id, dto({ name: 'Second' }), null);

      await rules.remove(org.id, source.id, first.id, null);

      const entries = await managedEntries();
      expect(entries.map((e) => e.managedByRuleId)).toEqual([second.id]);
    });

    it('go to the waiting rule when the rule holding them is paused', async () => {
      await seedEvent();
      const first = await rules.create(org.id, source.id, dto({ name: 'First' }), null);
      const second = await rules.create(org.id, source.id, dto({ name: 'Second' }), null);

      await rules.update(org.id, source.id, first.id, { enabled: false }, null);

      expect((await managedEntries()).map((e) => e.managedByRuleId)).toEqual([second.id]);
    });

    it('come back after the manual entry holding them is deleted', async () => {
      await seedEvent();
      const manual = await seedManual({ screenId: screen.id }, SLOT_START, SLOT_END);
      const rule = await rules.create(org.id, source.id, dto(), null);
      expect(await managedEntries()).toHaveLength(1);

      await schedule.delete(manual.id, org.id);
      await reconcile.reconcileRulesOn([{ screenId: screen.id, groupId: null }]);

      const [entry] = await managedEntries();
      expect(entry.managedByRuleId).toBe(rule.id);
    });
  });

  describe('manual edits', () => {
    it('are announced for the listener, generated entries are not', async () => {
      await seedEvent();
      await rules.create(org.id, source.id, dto(), null);
      expect(emit).not.toHaveBeenCalledWith(SCHEDULE_ENTRIES_EDITED, expect.anything());

      await seedManual({ screenId: screen.id }, SLOT_END, new Date('2026-11-05T23:00:00Z'));

      expect(emit).toHaveBeenCalledWith(
        SCHEDULE_ENTRIES_EDITED,
        expect.objectContaining({ organisationId: org.id, screenId: screen.id, groupId: null }),
      );
    });
  });

  describe('displaced slots', () => {
    const BEFORE = new Date('2026-11-01T00:00:00Z');

    it('lists a slot a manual entry holds, with the rule and the entry that won', async () => {
      const event = await seedEvent();
      const manual = await seedManual({ screenId: screen.id }, SLOT_START, SLOT_END);
      const rule = await rules.create(org.id, source.id, dto(), null);

      const displaced = await schedule.findDisplaced(org.id, BEFORE);

      expect(displaced).toEqual([
        {
          ruleId: rule.id,
          ruleName: rule.name,
          sourceId: source.id,
          colour: rule.colour,
          eventTitle: event.title,
          startTime: SLOT_START.toISOString(),
          endTime: SLOT_END.toISOString(),
          screenId: screen.id,
          groupId: null,
          targetName: screen.name,
          playlistName: playlist.name,
          genres: null,
          blockingEntry: { id: manual.id, name: null, playlistName: playlist.name },
        },
      ]);
    });

    it('drops the slot once the rule has it again or it has ended', async () => {
      await seedEvent();
      const manual = await seedManual({ screenId: screen.id }, SLOT_START, SLOT_END);
      const rule = await rules.create(org.id, source.id, dto(), null);

      expect(await schedule.findDisplaced(org.id, new Date(SLOT_END.getTime() + 1))).toEqual([]);

      await schedule.delete(manual.id, org.id);
      await reconcile.reconcile(rule.id, BEFORE);
      expect(await schedule.findDisplaced(org.id, BEFORE)).toEqual([]);
    });

    it('leaves out a disabled rule', async () => {
      await seedEvent();
      await seedManual({ screenId: screen.id }, SLOT_START, SLOT_END);
      const rule = await rules.create(org.id, source.id, dto(), null);

      await rules.update(org.id, source.id, rule.id, { enabled: false }, null);

      expect(await schedule.findDisplaced(org.id, BEFORE)).toEqual([]);
    });
  });

  describe('genre variants', () => {
    const baseRule = (): PlaylistRule => ({
      sourceIds: [source.id],
      genres: { match: 'any', values: [] },
      venues: [],
      dateFrom: { mode: 'today' },
      dateTo: { mode: 'none' },
      excludeCancelled: true,
      excludeSoldOut: false,
      sort: 'date_asc',
      limit: 10,
      graceHours: 2,
      refreshIntervalMinutes: 60,
      format: '1920x1080',
      itemDurationSeconds: 10,
      transition: TransitionType.Fade,
      transitionDurationMs: 500,
    });

    async function seedDynamic(): Promise<Playlist> {
      const [row] = await db
        .insert(playlists)
        .values({
          organisationId: org.id,
          name: 'Demnächst',
          kind: PlaylistKind.Dynamic,
          rule: baseRule(),
        })
        .returning();
      return row;
    }

    async function variantsOf(ruleId: string): Promise<Playlist[]> {
      return db.select().from(playlists).where(eq(playlists.managedByRuleId, ruleId));
    }

    it('names the genre group of a displaced slot and the playlist it narrows', async () => {
      const dynamic = await seedDynamic();
      await seedEvent({ genres: ['Rock'] });
      await seedManual({ screenId: screen.id }, SLOT_START, SLOT_END);

      await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock', 'Metal'] }] }),
        null,
      );

      const [slot] = await schedule.findDisplaced(org.id, new Date('2026-11-01T00:00:00Z'));
      expect(slot).toMatchObject({ playlistName: 'Demnächst', genres: ['Rock', 'Metal'] });
    });

    it('plays a narrowed copy of the playlist on events of a genre group', async () => {
      const dynamic = await seedDynamic();
      const rock = await seedEvent({ genres: ['Metal', 'Pop'] });
      const jazz = await seedEvent({ eventDate: '2026-11-12', genres: ['Jazz'] });

      const rule = await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock', 'Metal'] }] }),
        null,
      );

      const [variant] = await variantsOf(rule.id);
      expect(variant).toMatchObject({
        name: 'Demnächst · Rock, Metal',
        kind: PlaylistKind.Dynamic,
        rule: { ...baseRule(), genres: { match: 'any', values: ['Rock', 'Metal'] } },
      });
      const entries = await managedEntries();
      const playlistOf = (eventId: string) =>
        entries.find((e) => e.managedSourceEventId === eventId)?.playlistId;
      expect(playlistOf(rock.id)).toBe(variant.id);
      expect(playlistOf(jazz.id)).toBe(dynamic.id);
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_RESOLVE_REQUESTED,
        expect.objectContaining({ playlistId: variant.id }),
      );
    });

    it('follows an event that changes its genre', async () => {
      const dynamic = await seedDynamic();
      const event = await seedEvent({ genres: ['Jazz'] });
      const rule = await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock'] }] }),
        null,
      );
      await db
        .update(sourceEvents)
        .set({ genres: ['Rock'] })
        .where(eq(sourceEvents.id, event.id));

      await reconcile.reconcile(rule.id);

      const [variant] = await variantsOf(rule.id);
      const [entry] = await managedEntries();
      expect(entry.playlistId).toBe(variant.id);
    });

    it('keeps an unchanged variant without resolving it again', async () => {
      const dynamic = await seedDynamic();
      const rule = await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock'] }] }),
        null,
      );
      const [before] = await variantsOf(rule.id);
      emit.mockClear();

      await reconcile.reconcile(rule.id);

      expect(await variantsOf(rule.id)).toEqual([before]);
      expect(emit).not.toHaveBeenCalledWith(PLAYLIST_RESOLVE_REQUESTED, expect.anything());
    });

    it('copies a new rule of the playlist into its variants', async () => {
      const dynamic = await seedDynamic();
      const rule = await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock'] }] }),
        null,
      );
      await db
        .update(playlists)
        .set({ rule: { ...baseRule(), limit: 3 } })
        .where(eq(playlists.id, dynamic.id));

      expect(await reconcile.ruleIdsWithVariantsOf(dynamic.id)).toEqual([rule.id]);
      await reconcile.reconcile(rule.id);

      const [variant] = await variantsOf(rule.id);
      expect(variant.rule).toMatchObject({ limit: 3, genres: { values: ['Rock'] } });
    });

    it('moves entries back and drops the variants when the groups go', async () => {
      const dynamic = await seedDynamic();
      await seedEvent({ genres: ['Rock'] });
      const rule = await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock'] }] }),
        null,
      );

      await rules.update(org.id, source.id, rule.id, { genreVariants: [] }, null);

      const [entry] = await managedEntries();
      expect(entry.playlistId).toBe(dynamic.id);
      expect(await variantsOf(rule.id)).toEqual([]);
      expect(emit).toHaveBeenCalledWith(
        AUDIT_EVENT_SCHEDULE_RULE_UPDATED,
        expect.objectContaining({
          details: expect.objectContaining({
            changes: { genreVariants: { from: ['Rock'], to: [] } },
          }),
        }),
      );
    });

    it('hides variants from the playlists a rule may use', async () => {
      const dynamic = await seedDynamic();
      const rule = await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock'] }] }),
        null,
      );
      const [variant] = await variantsOf(rule.id);

      await expect(
        rules.create(org.id, source.id, dto({ playlistId: variant.id }), null),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    async function seedOwnDynamic(name: string, limit = 5): Promise<Playlist> {
      const [row] = await db
        .insert(playlists)
        .values({
          organisationId: org.id,
          name,
          kind: PlaylistKind.Dynamic,
          rule: { ...baseRule(), limit },
        })
        .returning();
      return row;
    }

    it("plays a group's own static playlist as it is, without a copy", async () => {
      const dynamic = await seedDynamic();
      const rock = await seedEvent({ genres: ['Rock'] });
      const jazz = await seedEvent({ eventDate: '2026-11-12', genres: ['Jazz'] });

      const rule = await rules.create(
        org.id,
        source.id,
        dto({
          playlistId: dynamic.id,
          genreVariants: [{ genres: ['Rock'], playlistId: playlist.id }],
        }),
        null,
      );

      expect(await variantsOf(rule.id)).toEqual([]);
      const entries = await managedEntries();
      const playlistOf = (eventId: string) =>
        entries.find((e) => e.managedSourceEventId === eventId)?.playlistId;
      expect(playlistOf(rock.id)).toBe(playlist.id);
      expect(playlistOf(jazz.id)).toBe(dynamic.id);
    });

    it("narrows a group's own dynamic playlist to the group's genres", async () => {
      const dynamic = await seedDynamic();
      const rockEvening = await seedOwnDynamic('Rock-Abend', 4);
      const rock = await seedEvent({ genres: ['Rock'] });

      const rule = await rules.create(
        org.id,
        source.id,
        dto({
          playlistId: dynamic.id,
          genreVariants: [{ genres: ['Rock'], playlistId: rockEvening.id }],
        }),
        null,
      );

      const [variant] = await variantsOf(rule.id);
      expect(variant).toMatchObject({
        name: 'Rock-Abend · Rock',
        rule: { limit: 4, genres: { match: 'any', values: ['Rock'] } },
      });
      const [entry] = (await managedEntries()).filter((e) => e.managedSourceEventId === rock.id);
      expect(entry.playlistId).toBe(variant.id);
    });

    it('lets genre groups use a static rule playlist when every group has its own', async () => {
      const rockEvening = await seedOwnDynamic('Rock-Abend');
      const jazz = await seedEvent({ eventDate: '2026-11-12', genres: ['Jazz'] });

      const rule = await rules.create(
        org.id,
        source.id,
        dto({ genreVariants: [{ genres: ['Rock'], playlistId: rockEvening.id }] }),
        null,
      );

      expect(await variantsOf(rule.id)).toHaveLength(1);
      const [entry] = (await managedEntries()).filter((e) => e.managedSourceEventId === jazz.id);
      expect(entry.playlistId).toBe(playlist.id);
    });

    it('updates the copy in place when a group switches to another dynamic playlist', async () => {
      const dynamic = await seedDynamic();
      const rockEvening = await seedOwnDynamic('Rock-Abend', 4);
      const rule = await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock'] }] }),
        null,
      );
      const [before] = await variantsOf(rule.id);
      emit.mockClear();

      await rules.update(
        org.id,
        source.id,
        rule.id,
        { genreVariants: [{ genres: ['Rock'], playlistId: rockEvening.id }] },
        null,
      );

      const [after] = await variantsOf(rule.id);
      expect(after.id).toBe(before.id);
      expect(after).toMatchObject({ name: 'Rock-Abend · Rock', rule: { limit: 4 } });
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_RESOLVE_REQUESTED,
        expect.objectContaining({ playlistId: after.id }),
      );
      expect(emit).toHaveBeenCalledWith(
        AUDIT_EVENT_SCHEDULE_RULE_UPDATED,
        expect.objectContaining({
          details: expect.objectContaining({
            changes: { genreVariants: { from: ['Rock'], to: ['Rock → Rock-Abend'] } },
          }),
        }),
      );
    });

    it('drops the copy when a group switches to a static playlist', async () => {
      const dynamic = await seedDynamic();
      await seedEvent({ genres: ['Rock'] });
      const rule = await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock'] }] }),
        null,
      );

      await rules.update(
        org.id,
        source.id,
        rule.id,
        { genreVariants: [{ genres: ['Rock'], playlistId: playlist.id }] },
        null,
      );

      const [entry] = await managedEntries();
      expect(entry.playlistId).toBe(playlist.id);
      expect(await variantsOf(rule.id)).toEqual([]);
    });

    it("follows a change to a group's own dynamic playlist", async () => {
      const dynamic = await seedDynamic();
      const rockEvening = await seedOwnDynamic('Rock-Abend', 4);
      const rule = await rules.create(
        org.id,
        source.id,
        dto({
          playlistId: dynamic.id,
          genreVariants: [{ genres: ['Rock'], playlistId: rockEvening.id }],
        }),
        null,
      );
      await db
        .update(playlists)
        .set({ rule: { ...baseRule(), limit: 2 } })
        .where(eq(playlists.id, rockEvening.id));

      expect(await reconcile.ruleIdsWithVariantsOf(rockEvening.id)).toEqual([rule.id]);
      await reconcile.reconcile(rule.id);

      const [variant] = await variantsOf(rule.id);
      expect(variant.rule).toMatchObject({ limit: 2, genres: { values: ['Rock'] } });
    });

    it('stores a group without its own playlist as before, even when sent null', async () => {
      const dynamic = await seedDynamic();

      const rule = await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock'], playlistId: null }] }),
        null,
      );

      expect(rule.genreVariants).toEqual([{ genres: ['Rock'] }]);
    });

    it('refuses a group playlist that is foreign, hidden or missing', async () => {
      const dynamic = await seedDynamic();
      const other = await rules.create(
        org.id,
        source.id,
        dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Pop'] }] }),
        null,
      );
      const [hidden] = await variantsOf(other.id);
      const [otherOrg] = await db
        .insert(organisations)
        .values({ name: `Other ${Math.random()}`, timeZone: 'UTC' })
        .returning();
      const [foreignPlaylist] = await db
        .insert(playlists)
        .values({ organisationId: otherOrg.id, name: 'X' })
        .returning();

      for (const playlistId of [
        foreignPlaylist.id,
        hidden.id,
        '00000000-0000-4000-8000-000000000000',
      ]) {
        await expect(
          rules.create(
            org.id,
            source.id,
            dto({ playlistId: dynamic.id, genreVariants: [{ genres: ['Rock'], playlistId }] }),
            null,
          ),
        ).rejects.toBeInstanceOf(NotFoundException);
      }
    });

    it('rejects genre groups on a static playlist and duplicate groups', async () => {
      const dynamic = await seedDynamic();

      await expect(
        rules.create(org.id, source.id, dto({ genreVariants: [{ genres: ['Rock'] }] }), null),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        rules.create(
          org.id,
          source.id,
          dto({
            playlistId: dynamic.id,
            genreVariants: [{ genres: ['Rock', 'Pop'] }, { genres: ['Pop', 'Rock'] }],
          }),
          null,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('split groups', () => {
    it('slice each playlist once, however many events', async () => {
      const wall = await seedGroup(ScreenGroupMode.Split);
      await seedEvent();
      await seedEvent({ eventDate: '2026-11-12' });

      await rules.create(org.id, source.id, dto({ screenIds: [], groupIds: [wall.id] }), null);

      expect(sliceAdd).toHaveBeenCalledTimes(1);
      expect(sliceAdd).toHaveBeenCalledWith(
        'slice',
        expect.objectContaining({ groupId: wall.id, playlistId: playlist.id }),
      );
    });

    it('queue a slice job again when the first one could not be queued', async () => {
      const wall = await seedGroup(ScreenGroupMode.Split);
      await seedEvent();
      sliceAdd.mockRejectedValueOnce(new Error('redis down'));

      const rule = await rules.create(
        org.id,
        source.id,
        dto({ screenIds: [], groupIds: [wall.id] }),
        null,
      );
      // markQueued wrote a row before the queue failed; a lost row is what the heal looks for.
      await db.delete(sliceJobs);
      sliceAdd.mockClear();

      await reconcile.reconcile(rule.id);

      expect(sliceAdd).toHaveBeenCalledTimes(1);
    });
  });
});
