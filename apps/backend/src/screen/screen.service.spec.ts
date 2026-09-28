import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { ScreenService } from './screen.service';
import { ScreenPairingService } from './screen-pairing.service';
import { ScheduleService } from '../schedule';
import { DRIZZLE } from '../db/database.constants';
import {
  contents,
  organisations,
  playlistItems,
  playlists,
  screenPairings,
  screens,
  type Organisation,
  type Screen,
} from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { SCREEN_STATUS_CHANGED } from './screen-status.event';
import { SCREEN_SETTINGS_CHANGED, SCREEN_REFRESH_REQUESTED } from './screen-state.event';
import {
  AUDIT_SCREEN_REGISTERED,
  AUDIT_SCREEN_ONLINE,
  AUDIT_SCREEN_REFRESHED,
  AUDIT_SCREEN_BULK_DELETED,
  AUDIT_SCREEN_BULK_GROUP_ASSIGNED,
  AUDIT_SCREEN_PAIRING_FAILED,
} from '../audit-log/audit.events';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import * as apiKeyUtil from './api-key.util';
import { sha256hex } from './api-key.util';
import { ScreenSessionService } from './screen-session.service';
import { TokenService } from '../auth/token.service';

jest.mock('./api-key.util', () => {
  const actual = jest.requireActual('./api-key.util');
  return {
    ...actual,
    generateApiKey: jest.fn(),
    hashApiKey: jest.fn(),
  };
});

const mockedApiKeyUtil = apiKeyUtil as jest.Mocked<typeof apiKeyUtil>;

describe('ScreenService', () => {
  let service: ScreenService;
  let getCurrentPlaylist: jest.Mock;
  let db: DrizzleDB;
  let emit: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    emit = jest.fn();
    getCurrentPlaylist = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenService,
        ScreenSessionService,
        {
          provide: TokenService,
          useValue: {
            issueScreenAccessToken: jest.fn().mockResolvedValue({
              token: 'access',
              jti: 'jti',
              expiresAt: new Date(),
            }),
            accessTokenTtlSeconds: 900,
          },
        },
        ScreenPairingService,
        { provide: DRIZZLE, useValue: db },
        { provide: EventEmitter2, useValue: { emit } },
        { provide: ScheduleService, useValue: { getCurrentPlaylist } },
      ],
    }).compile();
    service = module.get<ScreenService>(ScreenService);

    mockedApiKeyUtil.generateApiKey.mockReturnValue('test-api-key-plaintext');
    mockedApiKeyUtil.hashApiKey.mockResolvedValue('$2b$10$hashedvalue');
  });

  /** Insert a pending pairing row and return its code. */
  async function seedPairing(
    code: string,
    overrides: Partial<typeof screenPairings.$inferInsert> = {},
  ) {
    const [row] = await db
      .insert(screenPairings)
      .values({
        code,
        pairingSecretHash: sha256hex('secret'),
        status: 'pending',
        expiresAt: new Date(Date.now() + 60_000),
        ...overrides,
      })
      .returning();
    return row;
  }

  async function seedOrg(overrides: Partial<Organisation> = {}): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC', ...overrides })
      .returning();
    return org;
  }

  async function seedScreen(
    organisationId: string,
    overrides: Partial<Screen> = {},
  ): Promise<Screen> {
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId,
        name: 'Main Stage',
        resolution: '1920x1080',
        location: 'Stage Left',
        apiKeyHash: '$2b$10$existing',
        ...overrides,
      })
      .returning();
    return screen;
  }

  async function seedContent(
    organisationId: string,
    overrides: Partial<typeof contents.$inferInsert> = {},
  ) {
    const [content] = await db
      .insert(contents)
      .values({
        organisationId,
        title: 'Clip',
        type: ContentType.Image,
        originalFilename: 'clip.png',
        originalMimeType: 'image/png',
        originalSizeBytes: 1024,
        thumbnailSizeBytes: 256,
        ...overrides,
      })
      .returning();
    return content;
  }

  /** Seed a playlist with the given contents added as items in array order. */
  async function seedPlaylistWithItems(organisationId: string, contentIds: string[]) {
    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId, name: 'Morning Loop' })
      .returning();
    if (contentIds.length > 0) {
      await db.insert(playlistItems).values(
        contentIds.map((contentId, position) => ({
          playlistId: playlist.id,
          contentId,
          position,
          durationSeconds: 10,
        })),
      );
    }
    return playlist;
  }

  describe('createScreen', () => {
    it('should create a screen and claim the pairing, attaching the key to the pairing', async () => {
      const org = await seedOrg();
      await seedPairing('123456');
      const dto = {
        name: 'Main Stage',
        resolution: '1920x1080',
        location: 'Stage Left',
        pairingCode: '123456',
      };

      const screen = await service.createScreen(org.id, dto);

      expect(mockedApiKeyUtil.generateApiKey).toHaveBeenCalled();
      expect(mockedApiKeyUtil.hashApiKey).toHaveBeenCalledWith('test-api-key-plaintext');
      expect(screen.name).toBe(dto.name);
      expect(screen.organisationId).toBe(org.id);
      expect(screen.apiKeyHash).toBe('$2b$10$hashedvalue');

      const rows = await db.select().from(screens).where(eq(screens.id, screen.id));
      expect(rows).toHaveLength(1);

      const [pairing] = await db
        .select()
        .from(screenPairings)
        .where(eq(screenPairings.code, '123456'));
      expect(pairing.status).toBe('claimed');
      expect(pairing.screenId).toBe(screen.id);
      expect(pairing.organisationId).toBe(org.id);
      expect(pairing.apiKey).toBe('test-api-key-plaintext');

      expect(emit).toHaveBeenCalledWith(AUDIT_SCREEN_REGISTERED, expect.anything());
    });

    it('should throw BadRequestException when the pairing code is invalid', async () => {
      const org = await seedOrg();
      await expect(
        service.createScreen(org.id, {
          name: 'X',
          resolution: '1920x1080',
          location: 'Y',
          pairingCode: '000000',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('emits a failed-claim audit event with a REDACTED code on an invalid code', async () => {
      const org = await seedOrg();
      await expect(
        service.createScreen(
          org.id,
          {
            name: 'X',
            resolution: '1920x1080',
            location: 'Y',
            pairingCode: '987654',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(emit).toHaveBeenCalledWith(
        AUDIT_SCREEN_PAIRING_FAILED,
        expect.objectContaining({
          organisationId: org.id,
          userId: 'user-1',
          details: { code: '98****', context: 'create' },
        }),
      );
      // The full code must never appear in the emitted payload.
      const failedCall = emit.mock.calls.find((c) => c[0] === AUDIT_SCREEN_PAIRING_FAILED);
      expect(JSON.stringify(failedCall)).not.toContain('987654');
    });

    it('should throw BadRequestException when the pairing code is expired', async () => {
      const org = await seedOrg();
      await seedPairing('654321', { expiresAt: new Date(Date.now() - 1000) });
      await expect(
        service.createScreen(org.id, {
          name: 'X',
          resolution: '1920x1080',
          location: 'Y',
          pairingCode: '654321',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all screens for the organisation', async () => {
      const org = await seedOrg();
      await seedScreen(org.id);

      const result = await service.findAll(org.id);

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no screens exist', async () => {
      const org = await seedOrg();
      const result = await service.findAll(org.id);
      expect(result).toEqual([]);
    });
  });

  describe('findAllWithPlaylist', () => {
    it('resolves the current playlist name and first-item thumbnail for online screens', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id, { isOnline: true });
      const first = await seedContent(org.id, { type: ContentType.Video, thumbnailSizeBytes: 512 });
      const second = await seedContent(org.id);
      const playlist = await seedPlaylistWithItems(org.id, [first.id, second.id]);
      getCurrentPlaylist.mockResolvedValue({ playlist, isDefault: false });

      const result = await service.findAllWithPlaylist(org.id);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(screen.id);
      expect(result[0].currentPlaylistName).toBe('Morning Loop');
      expect(result[0].currentPlaylistThumbnail).toEqual({
        contentId: first.id,
        type: ContentType.Video,
        thumbnailSizeBytes: 512,
      });
      expect(getCurrentPlaylist).toHaveBeenCalledWith(screen.id);
    });

    it('returns a null thumbnail when the active playlist has no items', async () => {
      const org = await seedOrg();
      await seedScreen(org.id, { isOnline: true });
      const playlist = await seedPlaylistWithItems(org.id, []);
      getCurrentPlaylist.mockResolvedValue({ playlist, isDefault: false });

      const result = await service.findAllWithPlaylist(org.id);

      expect(result[0].currentPlaylistName).toBe('Morning Loop');
      expect(result[0].currentPlaylistThumbnail).toBeNull();
    });

    it('returns null playlist for offline screens without querying the schedule', async () => {
      const org = await seedOrg();
      await seedScreen(org.id, { isOnline: false });

      const result = await service.findAllWithPlaylist(org.id);

      expect(result[0].currentPlaylistName).toBeNull();
      expect(result[0].currentPlaylistThumbnail).toBeNull();
      expect(getCurrentPlaylist).not.toHaveBeenCalled();
    });

    it('returns null when an online screen has no active playlist', async () => {
      const org = await seedOrg();
      await seedScreen(org.id, { isOnline: true });
      getCurrentPlaylist.mockResolvedValue({ playlist: null, isDefault: false });

      const result = await service.findAllWithPlaylist(org.id);

      expect(result[0].currentPlaylistName).toBeNull();
      expect(result[0].currentPlaylistThumbnail).toBeNull();
    });

    it('falls back to null when the schedule lookup throws', async () => {
      const org = await seedOrg();
      await seedScreen(org.id, { isOnline: true });
      getCurrentPlaylist.mockRejectedValue(new Error('boom'));

      const result = await service.findAllWithPlaylist(org.id);

      expect(result[0].currentPlaylistName).toBeNull();
      expect(result[0].currentPlaylistThumbnail).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return a screen by id scoped to organisation', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);

      const result = await service.findOne(org.id, screen.id);

      expect(result.id).toBe(screen.id);
    });

    it('should throw NotFoundException when screen not found', async () => {
      const org = await seedOrg();
      await expect(service.findOne(org.id, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateScreen', () => {
    it('should update screen fields', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id, { name: 'Before' });

      const result = await service.updateScreen(org.id, screen.id, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      const [row] = await db.select().from(screens).where(eq(screens.id, screen.id));
      expect(row.name).toBe('Updated Name');
    });

    it('persists the player UI toggles and pushes a settings refresh to the screen', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);

      const result = await service.updateScreen(org.id, screen.id, {
        showUnmuteButton: false,
        showDisconnectButton: false,
      });

      expect(result.showUnmuteButton).toBe(false);
      expect(result.showDisconnectButton).toBe(false);
      const [row] = await db.select().from(screens).where(eq(screens.id, screen.id));
      expect(row.showUnmuteButton).toBe(false);
      expect(row.showDisconnectButton).toBe(false);
      expect(emit).toHaveBeenCalledWith(
        SCREEN_SETTINGS_CHANGED,
        expect.objectContaining({ screenId: screen.id, organisationId: org.id }),
      );
    });

    it('should throw NotFoundException when screen not found', async () => {
      const org = await seedOrg();
      await expect(
        service.updateScreen(org.id, '00000000-0000-0000-0000-000000000000', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('refreshScreen', () => {
    it('emits a refresh request + audit event and returns the screen', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);

      const result = await service.refreshScreen(org.id, screen.id, 'user-7');

      expect(result.id).toBe(screen.id);
      expect(emit).toHaveBeenCalledWith(
        SCREEN_REFRESH_REQUESTED,
        expect.objectContaining({ screenId: screen.id, organisationId: org.id }),
      );
      expect(emit).toHaveBeenCalledWith(
        AUDIT_SCREEN_REFRESHED,
        expect.objectContaining({ screenId: screen.id, organisationId: org.id, userId: 'user-7' }),
      );
    });

    it('should throw NotFoundException when screen not found', async () => {
      const org = await seedOrg();
      await expect(
        service.refreshScreen(org.id, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('repairScreen', () => {
    it('regenerates the key and attaches it to the pending pairing', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      await seedPairing('246810');

      const result = await service.repairScreen(org.id, screen.id, '246810');

      expect(mockedApiKeyUtil.generateApiKey).toHaveBeenCalled();
      expect(mockedApiKeyUtil.hashApiKey).toHaveBeenCalledWith('test-api-key-plaintext');
      expect(result.id).toBe(screen.id);

      const [row] = await db.select().from(screens).where(eq(screens.id, screen.id));
      expect(row.apiKeyHash).toBe('$2b$10$hashedvalue');

      const [pairing] = await db
        .select()
        .from(screenPairings)
        .where(eq(screenPairings.code, '246810'));
      expect(pairing.status).toBe('claimed');
      expect(pairing.screenId).toBe(screen.id);
      expect(pairing.apiKey).toBe('test-api-key-plaintext');
    });

    it('should throw NotFoundException when screen not found', async () => {
      const org = await seedOrg();
      await seedPairing('111111');
      await expect(
        service.repairScreen(org.id, '00000000-0000-0000-0000-000000000000', '111111'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when the pairing code is invalid', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      await expect(service.repairScreen(org.id, screen.id, '999999')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('emits a failed-claim audit event with a REDACTED code on an invalid code', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);

      await expect(service.repairScreen(org.id, screen.id, '654321', 'user-9')).rejects.toThrow(
        BadRequestException,
      );

      expect(emit).toHaveBeenCalledWith(
        AUDIT_SCREEN_PAIRING_FAILED,
        expect.objectContaining({
          screenId: screen.id,
          organisationId: org.id,
          userId: 'user-9',
          details: { code: '65****', context: 'repair' },
        }),
      );
      const failedCall = emit.mock.calls.find((c) => c[0] === AUDIT_SCREEN_PAIRING_FAILED);
      expect(JSON.stringify(failedCall)).not.toContain('654321');
    });
  });

  describe('recordHeartbeat', () => {
    it('should update lastHeartbeat and set isOnline to true', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id, { isOnline: false });

      const result = await service.recordHeartbeat(org.id, screen.id);

      expect(result.lastHeartbeat).toBeInstanceOf(Date);
      expect(result.isOnline).toBe(true);
    });

    it('should emit status change event when screen was offline', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id, { isOnline: false });

      await service.recordHeartbeat(org.id, screen.id);

      expect(emit).toHaveBeenCalledWith(
        SCREEN_STATUS_CHANGED,
        expect.objectContaining({
          screenId: screen.id,
          organisationId: org.id,
          isOnline: true,
        }),
      );
      expect(emit).toHaveBeenCalledWith(AUDIT_SCREEN_ONLINE, expect.anything());
    });

    it('should not emit status change event when screen was already online', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id, { isOnline: true });

      await service.recordHeartbeat(org.id, screen.id);

      expect(emit).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when screen not found', async () => {
      const org = await seedOrg();
      await expect(
        service.recordHeartbeat(org.id, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkDelete', () => {
    it('deletes screens belonging to the organisation and emits audit events', async () => {
      const org = await seedOrg();
      const a = await seedScreen(org.id);
      const b = await seedScreen(org.id);

      const result = await service.bulkDelete(org.id, [a.id, b.id], 'user-1');

      expect(result.deleted).toBe(2);
      expect(result.notFound).toEqual([]);
      const remaining = await db.select().from(screens).where(eq(screens.organisationId, org.id));
      expect(remaining).toHaveLength(0);
      expect(emit).toHaveBeenCalledWith(AUDIT_SCREEN_BULK_DELETED, expect.anything());
    });

    it('reports notFound for unknown ids', async () => {
      const org = await seedOrg();
      const a = await seedScreen(org.id);

      const result = await service.bulkDelete(
        org.id,
        [a.id, '00000000-0000-0000-0000-000000000000'],
        null,
      );

      expect(result.deleted).toBe(1);
      expect(result.notFound).toEqual(['00000000-0000-0000-0000-000000000000']);
    });

    it('throws BadRequestException when an id belongs to another organisation', async () => {
      const org = await seedOrg();
      const other = await seedOrg();
      const foreign = await seedScreen(other.id);

      await expect(service.bulkDelete(org.id, [foreign.id], null)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('bulkAssignGroup', () => {
    it('assigns screens to a group', async () => {
      const org = await seedOrg();
      const a = await seedScreen(org.id);

      const result = await service.bulkAssignGroup(org.id, [a.id], null, 'user-1');

      expect(result.updated).toBe(1);
      expect(emit).toHaveBeenCalledWith(AUDIT_SCREEN_BULK_GROUP_ASSIGNED, expect.anything());
    });

    it('throws BadRequestException when an id belongs to another organisation', async () => {
      const org = await seedOrg();
      const other = await seedOrg();
      const foreign = await seedScreen(other.id);

      await expect(service.bulkAssignGroup(org.id, [foreign.id], null, null)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('detectOfflineScreens', () => {
    it('should mark online screens as offline when heartbeat is stale', async () => {
      const org = await seedOrg();
      const stale = await seedScreen(org.id, {
        isOnline: true,
        lastHeartbeat: new Date(Date.now() - 300_000),
      });

      const result = await service.detectOfflineScreens(120_000);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(stale.id);
      const [row] = await db.select().from(screens).where(eq(screens.id, stale.id));
      expect(row.isOnline).toBe(false);
    });

    it('should return empty array when no screens are stale', async () => {
      const org = await seedOrg();
      await seedScreen(org.id, { isOnline: true, lastHeartbeat: new Date() });

      const result = await service.detectOfflineScreens(120_000);

      expect(result).toEqual([]);
    });
  });

  describe('recordHeartbeat — player version telemetry', () => {
    it('records the version a player reports', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);

      const saved = await service.recordHeartbeat(org.id, screen.id, '0.9.1');

      expect(saved.playerVersion).toBe('0.9.1');
      expect(saved.isOnline).toBe(true);
    });

    it('does not erase a known version when an old player reports none', async () => {
      // This is what the rollout is gated on: "no version" must mean "never
      // reported", not "the last heartbeat happened to omit it".
      const org = await seedOrg();
      const screen = await seedScreen(org.id);
      await service.recordHeartbeat(org.id, screen.id, '0.9.1');

      const saved = await service.recordHeartbeat(org.id, screen.id);

      expect(saved.playerVersion).toBe('0.9.1');
    });

    it('leaves it null for a screen that has never reported one', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);

      expect((await service.recordHeartbeat(org.id, screen.id)).playerVersion).toBeNull();
    });
  });
});
