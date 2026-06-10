import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ScheduleService } from './schedule.service';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  screens,
  screenGroups,
  playlists,
  scheduleEntries,
  type Organisation,
  type Screen,
  type ScreenGroup,
  type Playlist,
} from '../db/schema';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { SCHEDULE_ENTRY_CHANGED, GROUP_SCHEDULE_CHANGED } from './schedule.event';
import { AUDIT_SCHEDULE_DELETED } from '../audit-log/audit.events';
import { SLICE_CONTENT_QUEUE } from '../slice-content';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let db: DrizzleDB;
  let emit: jest.Mock;
  let queueAdd: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    emit = jest.fn();
    queueAdd = jest.fn().mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: DRIZZLE, useValue: db },
        { provide: getQueueToken(SLICE_CONTENT_QUEUE), useValue: { add: queueAdd } },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    service = module.get<ScheduleService>(ScheduleService);
  });

  async function seedOrg(overrides: Partial<Organisation> = {}): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC', ...overrides })
      .returning();
    return org;
  }

  async function seedPlaylist(organisationId: string, name = 'PL'): Promise<Playlist> {
    const [playlist] = await db.insert(playlists).values({ organisationId, name }).returning();
    return playlist;
  }

  async function seedScreen(
    organisationId: string,
    overrides: Partial<Screen> = {},
  ): Promise<Screen> {
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId,
        name: 'Screen',
        resolution: '1920x1080',
        location: 'Lobby',
        apiKeyHash: `hash-${Math.random()}`,
        ...overrides,
      })
      .returning();
    return screen;
  }

  async function seedGroup(
    organisationId: string,
    overrides: Partial<ScreenGroup> = {},
  ): Promise<ScreenGroup> {
    const [group] = await db
      .insert(screenGroups)
      .values({ organisationId, name: 'Group', mode: ScreenGroupMode.Mirror, ...overrides })
      .returning();
    return group;
  }

  describe('create', () => {
    it('should create a schedule entry and emit event', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);

      const result = await service.create(org.id, {
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T12:00:00Z',
        colour: '#FF5733',
      });

      expect(result.organisationId).toBe(org.id);
      expect(result.screenId).toBe(screen.id);
      expect(result.colour).toBe('#FF5733');
      const rows = await db.select().from(scheduleEntries).where(eq(scheduleEntries.id, result.id));
      expect(rows).toHaveLength(1);
      expect(emit).toHaveBeenCalledWith(
        SCHEDULE_ENTRY_CHANGED,
        expect.objectContaining({ screenId: screen.id, organisationId: org.id }),
      );
    });

    it('should throw NotFoundException when screen not found', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);

      await expect(
        service.create(org.id, {
          screenId: '00000000-0000-0000-0000-000000000000',
          playlistId: playlist.id,
          startTime: '2026-04-01T10:00:00Z',
          endTime: '2026-04-01T12:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);

      await expect(
        service.create(org.id, {
          screenId: screen.id,
          playlistId: '00000000-0000-0000-0000-000000000000',
          startTime: '2026-04-01T10:00:00Z',
          endTime: '2026-04-01T12:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('overlap detection — single entries', () => {
    it('should throw ConflictException when entries overlap', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);
      await db.insert(scheduleEntries).values({
        organisationId: org.id,
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: null,
        colour: '#FF5733',
      });

      await expect(
        service.create(org.id, {
          screenId: screen.id,
          playlistId: playlist.id,
          startTime: '2026-04-01T11:00:00Z',
          endTime: '2026-04-01T13:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow non-overlapping entries', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);
      await db.insert(scheduleEntries).values({
        organisationId: org.id,
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: null,
        colour: '#FF5733',
      });

      const result = await service.create(org.id, {
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: '2026-04-01T12:00:00Z',
        endTime: '2026-04-01T14:00:00Z',
        colour: '#FF5733',
      });

      expect(result).toBeDefined();
      const rows = await db
        .select()
        .from(scheduleEntries)
        .where(eq(scheduleEntries.screenId, screen.id));
      expect(rows).toHaveLength(2);
    });
  });

  describe('overlap detection — recurring entries', () => {
    it('should detect overlap between recurring and single entry', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);
      // Existing: daily recurring 10:00-12:00
      await db.insert(scheduleEntries).values({
        organisationId: org.id,
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: 'FREQ=DAILY;COUNT=10',
        colour: '#FF5733',
      });

      // New entry on April 3rd 11:00-13:00 should overlap with the recurring entry
      await expect(
        service.create(org.id, {
          screenId: screen.id,
          playlistId: playlist.id,
          startTime: '2026-04-03T11:00:00Z',
          endTime: '2026-04-03T13:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow non-overlapping with recurring entry', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);
      // Existing: daily recurring 10:00-12:00
      await db.insert(scheduleEntries).values({
        organisationId: org.id,
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: 'FREQ=DAILY;COUNT=10',
        colour: '#FF5733',
      });

      // New entry on April 3rd 13:00-15:00 should not overlap
      const result = await service.create(org.id, {
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: '2026-04-03T13:00:00Z',
        endTime: '2026-04-03T15:00:00Z',
        colour: '#FF5733',
      });

      expect(result).toBeDefined();
    });
  });

  describe('update (move/resize)', () => {
    async function seedEntry(
      orgId: string,
      screenId: string,
      playlistId: string,
      start: string,
      end: string,
    ): Promise<string> {
      const [entry] = await db
        .insert(scheduleEntries)
        .values({
          organisationId: orgId,
          screenId,
          playlistId,
          startTime: new Date(start),
          endTime: new Date(end),
          rrule: null,
          colour: '#FF5733',
        })
        .returning();
      return entry.id;
    }

    it('should update start and end times (move)', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);
      const id = await seedEntry(
        org.id,
        screen.id,
        playlist.id,
        '2026-04-01T10:00:00Z',
        '2026-04-01T12:00:00Z',
      );

      const saved = await service.update(id, org.id, {
        startTime: '2026-04-01T14:00:00Z',
        endTime: '2026-04-01T16:00:00Z',
      });

      expect(saved.startTime).toEqual(new Date('2026-04-01T14:00:00Z'));
      expect(saved.endTime).toEqual(new Date('2026-04-01T16:00:00Z'));
      expect(emit).toHaveBeenCalledWith(
        SCHEDULE_ENTRY_CHANGED,
        expect.objectContaining({ screenId: screen.id }),
      );
    });

    it('should update only end time (resize)', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);
      const id = await seedEntry(
        org.id,
        screen.id,
        playlist.id,
        '2026-04-01T10:00:00Z',
        '2026-04-01T12:00:00Z',
      );

      const saved = await service.update(id, org.id, {
        endTime: '2026-04-01T14:00:00Z',
      });

      expect(saved.startTime).toEqual(new Date('2026-04-01T10:00:00Z'));
      expect(saved.endTime).toEqual(new Date('2026-04-01T14:00:00Z'));
    });

    it('should throw NotFoundException when entry not found', async () => {
      const org = await seedOrg();

      await expect(
        service.update('00000000-0000-0000-0000-000000000000', org.id, {
          startTime: '2026-04-01T14:00:00Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject update that causes overlap', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);
      const id1 = await seedEntry(
        org.id,
        screen.id,
        playlist.id,
        '2026-04-01T10:00:00Z',
        '2026-04-01T12:00:00Z',
      );
      await seedEntry(
        org.id,
        screen.id,
        playlist.id,
        '2026-04-01T14:00:00Z',
        '2026-04-01T16:00:00Z',
      );

      await expect(
        service.update(id1, org.id, {
          startTime: '2026-04-01T13:00:00Z',
          endTime: '2026-04-01T15:00:00Z',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete entry and emit event', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);
      const [entry] = await db
        .insert(scheduleEntries)
        .values({
          organisationId: org.id,
          screenId: screen.id,
          playlistId: playlist.id,
          startTime: new Date('2026-04-01T10:00:00Z'),
          endTime: new Date('2026-04-01T12:00:00Z'),
          rrule: null,
          colour: '#FF5733',
        })
        .returning();

      await service.delete(entry.id, org.id);

      const rows = await db.select().from(scheduleEntries).where(eq(scheduleEntries.id, entry.id));
      expect(rows).toHaveLength(0);
      expect(emit).toHaveBeenCalledWith(
        SCHEDULE_ENTRY_CHANGED,
        expect.objectContaining({ screenId: screen.id }),
      );
    });

    it('should throw NotFoundException when entry not found', async () => {
      const org = await seedOrg();
      await expect(service.delete('00000000-0000-0000-0000-000000000000', org.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should emit GROUP_SCHEDULE_CHANGED when deleting group entry', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id);
      const playlist = await seedPlaylist(org.id);
      const [entry] = await db
        .insert(scheduleEntries)
        .values({
          organisationId: org.id,
          screenId: null,
          groupId: group.id,
          playlistId: playlist.id,
          startTime: new Date('2026-04-01T10:00:00Z'),
          endTime: new Date('2026-04-01T12:00:00Z'),
          rrule: null,
          colour: '#FF5733',
        })
        .returning();

      await service.delete(entry.id, org.id);

      expect(emit).toHaveBeenCalledWith(
        GROUP_SCHEDULE_CHANGED,
        expect.objectContaining({
          groupId: group.id,
          organisationId: org.id,
          playlistId: playlist.id,
        }),
      );
    });

    it('should not emit SCHEDULE_ENTRY_CHANGED when deleting group entry', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id);
      const playlist = await seedPlaylist(org.id);
      const [entry] = await db
        .insert(scheduleEntries)
        .values({
          organisationId: org.id,
          screenId: null,
          groupId: group.id,
          playlistId: playlist.id,
          startTime: new Date('2026-04-01T10:00:00Z'),
          endTime: new Date('2026-04-01T12:00:00Z'),
          rrule: null,
          colour: '#FF5733',
        })
        .returning();

      await service.delete(entry.id, org.id);

      const screenChangedCalls = emit.mock.calls.filter(
        (c: unknown[]) => c[0] === SCHEDULE_ENTRY_CHANGED,
      );
      expect(screenChangedCalls).toHaveLength(0);
    });

    it('should include groupId in audit event when deleting group entry', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id);
      const playlist = await seedPlaylist(org.id);
      const [entry] = await db
        .insert(scheduleEntries)
        .values({
          organisationId: org.id,
          screenId: null,
          groupId: group.id,
          playlistId: playlist.id,
          startTime: new Date('2026-04-01T10:00:00Z'),
          endTime: new Date('2026-04-01T12:00:00Z'),
          rrule: null,
          colour: '#FF5733',
        })
        .returning();

      await service.delete(entry.id, org.id);

      expect(emit).toHaveBeenCalledWith(
        AUDIT_SCHEDULE_DELETED,
        expect.objectContaining({
          details: expect.objectContaining({ groupId: group.id }),
        }),
      );
    });
  });

  describe('getCurrentPlaylist', () => {
    it('should return the active playlist when a schedule entry is active', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id, 'Active Playlist');
      const now = Date.now();
      await db.insert(scheduleEntries).values({
        organisationId: org.id,
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: new Date(now - 60 * 60 * 1000),
        endTime: new Date(now + 60 * 60 * 1000),
        rrule: null,
        colour: '#FF5733',
      });

      const result = await service.getCurrentPlaylist(screen.id);

      expect(result.playlist).toEqual(expect.objectContaining({ name: 'Active Playlist' }));
      expect(result.isDefault).toBe(false);
    });

    it('should return the fallback playlist when no entry is active', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const future = await seedPlaylist(org.id, 'Future Playlist');
      const fallback = await seedPlaylist(org.id, 'Default Playlist');
      await db
        .update(organisations)
        .set({ defaultPlaylistId: fallback.id })
        .where(eq(organisations.id, org.id));
      const now = Date.now();
      await db.insert(scheduleEntries).values({
        organisationId: org.id,
        screenId: screen.id,
        playlistId: future.id,
        startTime: new Date(now + 60 * 60 * 1000),
        endTime: new Date(now + 2 * 60 * 60 * 1000),
        rrule: null,
        colour: '#FF5733',
      });

      const result = await service.getCurrentPlaylist(screen.id);

      expect(result.isDefault).toBe(true);
      expect(result.playlist).toEqual(expect.objectContaining({ name: 'Default Playlist' }));
    });

    it('should return null playlist when no entries and no default', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);

      const result = await service.getCurrentPlaylist(screen.id);

      expect(result.playlist).toBeNull();
      expect(result.isDefault).toBe(true);
    });

    it('should resolve group schedule when no direct screen schedule is active', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id);
      const screen = await seedScreen(org.id, { groupId: group.id });
      const groupPlaylist = await seedPlaylist(org.id, 'Group Playlist');
      const now = Date.now();
      await db.insert(scheduleEntries).values({
        organisationId: org.id,
        screenId: null,
        groupId: group.id,
        playlistId: groupPlaylist.id,
        startTime: new Date(now - 60 * 60 * 1000),
        endTime: new Date(now + 60 * 60 * 1000),
        rrule: null,
        colour: '#FF5733',
      });

      const result = await service.getCurrentPlaylist(screen.id);

      expect(result.playlist).toEqual(expect.objectContaining({ name: 'Group Playlist' }));
      expect(result.isDefault).toBe(false);
    });

    it('should prefer direct screen schedule over group schedule', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id);
      const screen = await seedScreen(org.id, { groupId: group.id });
      const screenPlaylist = await seedPlaylist(org.id, 'Screen Playlist');
      const groupPlaylist = await seedPlaylist(org.id, 'Group Playlist');
      const now = Date.now();
      await db.insert(scheduleEntries).values([
        {
          organisationId: org.id,
          screenId: screen.id,
          playlistId: screenPlaylist.id,
          startTime: new Date(now - 60 * 60 * 1000),
          endTime: new Date(now + 60 * 60 * 1000),
          rrule: null,
          colour: '#FF5733',
        },
        {
          organisationId: org.id,
          screenId: null,
          groupId: group.id,
          playlistId: groupPlaylist.id,
          startTime: new Date(now - 60 * 60 * 1000),
          endTime: new Date(now + 60 * 60 * 1000),
          rrule: null,
          colour: '#00FF00',
        },
      ]);

      const result = await service.getCurrentPlaylist(screen.id);

      expect(result.playlist).toEqual(expect.objectContaining({ name: 'Screen Playlist' }));
      expect(result.isDefault).toBe(false);
    });

    it('should fall back to default when screen has group but no active group schedule', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id);
      const screen = await seedScreen(org.id, { groupId: group.id });
      const groupPlaylist = await seedPlaylist(org.id, 'Group Playlist');
      const now = Date.now();
      await db.insert(scheduleEntries).values({
        organisationId: org.id,
        screenId: null,
        groupId: group.id,
        playlistId: groupPlaylist.id,
        startTime: new Date(now + 60 * 60 * 1000), // future
        endTime: new Date(now + 2 * 60 * 60 * 1000),
        rrule: null,
        colour: '#FF5733',
      });

      const result = await service.getCurrentPlaylist(screen.id);

      expect(result.isDefault).toBe(true);
      expect(result.playlist).toBeNull();
    });

    it('should skip group lookup when screen has no groupId', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id, { groupId: null });

      const result = await service.getCurrentPlaylist(screen.id);

      expect(result.isDefault).toBe(true);
      expect(result.playlist).toBeNull();
    });

    it('should return null when the screen does not exist', async () => {
      const result = await service.getCurrentPlaylist('00000000-0000-0000-0000-000000000000');
      expect(result.playlist).toBeNull();
      expect(result.isDefault).toBe(false);
    });
  });

  describe('findByScreen', () => {
    it('should return entries for a screen', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);
      await db.insert(scheduleEntries).values({
        organisationId: org.id,
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: null,
        colour: '#FF5733',
      });

      const result = await service.findByScreen(
        screen.id,
        org.id,
        new Date('2026-04-01'),
        new Date('2026-04-02'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].screenId).toBe(screen.id);
      expect(result[0].playlist).toEqual(expect.objectContaining({ id: playlist.id }));
    });
  });

  describe('findByOrganisation', () => {
    it('should return entries for an organisation with relations', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id);
      const screen = await seedScreen(org.id);
      const playlist = await seedPlaylist(org.id);
      await db.insert(scheduleEntries).values([
        {
          organisationId: org.id,
          screenId: screen.id,
          playlistId: playlist.id,
          startTime: new Date('2026-04-01T10:00:00Z'),
          endTime: new Date('2026-04-01T12:00:00Z'),
          rrule: null,
          colour: '#FF5733',
        },
        {
          organisationId: org.id,
          screenId: null,
          groupId: group.id,
          playlistId: playlist.id,
          startTime: new Date('2026-04-02T10:00:00Z'),
          endTime: new Date('2026-04-02T12:00:00Z'),
          rrule: null,
          colour: '#00FF00',
        },
      ]);

      const result = await service.findByOrganisation(
        org.id,
        new Date('2026-04-01'),
        new Date('2026-04-30'),
      );

      expect(result).toHaveLength(2);
      const groupEntry = result.find((e) => e.groupId === group.id);
      expect(groupEntry).toBeDefined();
      expect((groupEntry as unknown as { group: ScreenGroup }).group).toEqual(
        expect.objectContaining({ id: group.id }),
      );
    });
  });

  describe('target validation (screenId / groupId)', () => {
    it('should throw BadRequestException when neither screenId nor groupId is set', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);

      await expect(
        service.create(org.id, {
          playlistId: playlist.id,
          startTime: '2026-04-01T10:00:00Z',
          endTime: '2026-04-01T12:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when both screenId and groupId are set', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      const group = await seedGroup(org.id);
      const playlist = await seedPlaylist(org.id);

      await expect(
        service.create(org.id, {
          screenId: screen.id,
          groupId: group.id,
          playlistId: playlist.id,
          startTime: '2026-04-01T10:00:00Z',
          endTime: '2026-04-01T12:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('group-based scheduling', () => {
    it('should create a schedule entry targeting a group', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id, { mode: ScreenGroupMode.Mirror });
      const playlist = await seedPlaylist(org.id);

      const result = await service.create(org.id, {
        groupId: group.id,
        playlistId: playlist.id,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T12:00:00Z',
        colour: '#FF5733',
      });

      expect(result.groupId).toBe(group.id);
      expect(result.screenId).toBeNull();
      expect(result.playlistId).toBe(playlist.id);
      expect(emit).toHaveBeenCalledWith(
        GROUP_SCHEDULE_CHANGED,
        expect.objectContaining({ groupId: group.id, organisationId: org.id }),
      );
    });

    it('should throw NotFoundException when group not found in organisation', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);

      await expect(
        service.create(org.id, {
          groupId: '00000000-0000-0000-0000-000000000000',
          playlistId: playlist.id,
          startTime: '2026-04-01T10:00:00Z',
          endTime: '2026-04-01T12:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enqueue slice-content job when group mode is split', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id, { mode: ScreenGroupMode.Split });
      const playlist = await seedPlaylist(org.id);

      await service.create(org.id, {
        groupId: group.id,
        playlistId: playlist.id,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T12:00:00Z',
        colour: '#FF5733',
      });

      expect(queueAdd).toHaveBeenCalledWith(
        'slice',
        expect.objectContaining({
          groupId: group.id,
          playlistId: playlist.id,
          organisationId: org.id,
        }),
      );
    });

    it('should not enqueue slice-content job when group mode is mirror', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id, { mode: ScreenGroupMode.Mirror });
      const playlist = await seedPlaylist(org.id);

      await service.create(org.id, {
        groupId: group.id,
        playlistId: playlist.id,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T12:00:00Z',
        colour: '#FF5733',
      });

      expect(queueAdd).not.toHaveBeenCalled();
    });

    it('should not run overlap check for group-targeted entries', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id, { mode: ScreenGroupMode.Mirror });
      const playlist = await seedPlaylist(org.id);
      // A group entry that would overlap if overlap-checked — but groups are never checked.
      await db.insert(scheduleEntries).values({
        organisationId: org.id,
        screenId: null,
        groupId: group.id,
        playlistId: playlist.id,
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: null,
        colour: '#FF5733',
      });

      const result = await service.create(org.id, {
        groupId: group.id,
        playlistId: playlist.id,
        startTime: '2026-04-01T11:00:00Z',
        endTime: '2026-04-01T13:00:00Z',
        colour: '#FF5733',
      });

      expect(result).toBeDefined();
    });

    it('should enqueue slice-content job on update when group mode is split', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id, { mode: ScreenGroupMode.Split });
      const playlist = await seedPlaylist(org.id);
      const [entry] = await db
        .insert(scheduleEntries)
        .values({
          organisationId: org.id,
          screenId: null,
          groupId: group.id,
          playlistId: playlist.id,
          startTime: new Date('2026-04-01T10:00:00Z'),
          endTime: new Date('2026-04-01T12:00:00Z'),
          rrule: null,
          colour: '#FF5733',
        })
        .returning();
      queueAdd.mockClear();

      await service.update(entry.id, org.id, { endTime: '2026-04-01T14:00:00Z' });

      expect(queueAdd).toHaveBeenCalledWith(
        'slice',
        expect.objectContaining({
          groupId: group.id,
          playlistId: playlist.id,
          organisationId: org.id,
        }),
      );
    });

    it('should not enqueue slice-content job on update when group mode is mirror', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id, { mode: ScreenGroupMode.Mirror });
      const playlist = await seedPlaylist(org.id);
      const [entry] = await db
        .insert(scheduleEntries)
        .values({
          organisationId: org.id,
          screenId: null,
          groupId: group.id,
          playlistId: playlist.id,
          startTime: new Date('2026-04-01T10:00:00Z'),
          endTime: new Date('2026-04-01T12:00:00Z'),
          rrule: null,
          colour: '#FF5733',
        })
        .returning();
      queueAdd.mockClear();

      await service.update(entry.id, org.id, { endTime: '2026-04-01T14:00:00Z' });

      expect(queueAdd).not.toHaveBeenCalled();
    });

    it('should emit GROUP_SCHEDULE_CHANGED on update when entry has groupId', async () => {
      const org = await seedOrg();
      const group = await seedGroup(org.id, { mode: ScreenGroupMode.Mirror });
      const playlist = await seedPlaylist(org.id);
      const [entry] = await db
        .insert(scheduleEntries)
        .values({
          organisationId: org.id,
          screenId: null,
          groupId: group.id,
          playlistId: playlist.id,
          startTime: new Date('2026-04-01T10:00:00Z'),
          endTime: new Date('2026-04-01T12:00:00Z'),
          rrule: null,
          colour: '#FF5733',
        })
        .returning();
      emit.mockClear();

      await service.update(entry.id, org.id, { endTime: '2026-04-01T14:00:00Z' });

      expect(emit).toHaveBeenCalledWith(
        GROUP_SCHEDULE_CHANGED,
        expect.objectContaining({ groupId: group.id, organisationId: org.id }),
      );
    });
  });
});
