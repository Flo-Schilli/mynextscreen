import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import { SecretCipher } from '../common/secret-cipher.service';
import { AUDIT_SCREEN_REMOTE_CONTROL_UPDATED } from '../audit-log/audit.events';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screenRemoteControls, screens, siteAgents } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('ScreenRemoteControlService', () => {
  let db: DrizzleDB;
  let service: ScreenRemoteControlService;
  let emitter: { emit: jest.Mock };
  let orgId: string;
  let otherOrgId: string;
  let screenId: string;
  let agentId: string;

  const userId = '880e8400-e29b-41d4-a716-446655440000';
  // A real key, so the test exercises the encrypting path rather than the
  // fail-open one — ciphertext in the column is the thing worth asserting.
  const encryptionKey = Buffer.alloc(32, 7).toString('base64');

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenRemoteControlService,
        SecretCipher,
        { provide: DRIZZLE, useValue: db },
        { provide: EventEmitter2, useValue: emitter },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => encryptionKey) },
        },
      ],
    }).compile();
    service = module.get(ScreenRemoteControlService);

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    const [other] = await db
      .insert(organisations)
      .values({ name: `Other ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    otherOrgId = other.id;

    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name: 'Foyer left',
        resolution: '1920x1080',
        location: 'Foyer',
        apiKeyHash: 'hash',
      })
      .returning();
    screenId = screen.id;

    const [agent] = await db
      .insert(siteAgents)
      .values({ organisationId: orgId, name: 'Venue North' })
      .returning();
    agentId = agent.id;
  });

  async function storedPassphrase(): Promise<string | null> {
    const [row] = await db
      .select()
      .from(screenRemoteControls)
      .where(eq(screenRemoteControls.screenId, screenId));
    return row?.devmodePassphrase ?? null;
  }

  describe('getForScreen', () => {
    it('returns usable defaults before anything is configured', async () => {
      const config = await service.getForScreen(orgId, screenId);

      expect(config.screenId).toBe(screenId);
      expect(config.agentId).toBeNull();
      expect(config.ssapPort).toBe(3001);
      expect(config.devmodeExtendIntervalDays).toBe(7);
      expect(config.onboardingStep).toBe(1);
    });

    it('defaults both wake reasons to off', async () => {
      const config = await service.getForScreen(orgId, screenId);

      expect(config.wakeBeforeScheduleEnabled).toBe(false);
      expect(config.wakeOnUnreachableEnabled).toBe(false);
    });

    it('refuses a screen from another organisation', async () => {
      const [foreign] = await db
        .insert(screens)
        .values({
          organisationId: otherOrgId,
          name: 'Theirs',
          resolution: '1920x1080',
          location: 'Elsewhere',
          apiKeyHash: 'hash',
        })
        .returning();

      await expect(service.getForScreen(orgId, foreign.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('passphrase handling', () => {
    it('stores the passphrase encrypted, never in the clear', async () => {
      await service.upsert(orgId, screenId, { devmodePassphrase: 'AEBC72' }, userId);

      const stored = await storedPassphrase();
      expect(stored).not.toBe('AEBC72');
      expect(SecretCipher.isEncrypted(stored as string)).toBe(true);
    });

    it('returns it decrypted to callers of this service', async () => {
      await service.upsert(orgId, screenId, { devmodePassphrase: 'AEBC72' }, userId);

      const config = await service.getForScreen(orgId, screenId);

      expect(config.devmodePassphrase).toBe('AEBC72');
    });

    // The client can never read the passphrase back, so an empty field is the
    // only honest way for it to say "unchanged".
    it('keeps the stored value when an empty string is sent', async () => {
      await service.upsert(orgId, screenId, { devmodePassphrase: 'AEBC72' }, userId);

      await service.upsert(orgId, screenId, { devmodePassphrase: '', localIp: '10.0.0.5' }, userId);

      const config = await service.getForScreen(orgId, screenId);
      expect(config.devmodePassphrase).toBe('AEBC72');
      expect(config.localIp).toBe('10.0.0.5');
    });

    it('keeps the stored value when the field is omitted entirely', async () => {
      await service.upsert(orgId, screenId, { devmodePassphrase: 'AEBC72' }, userId);

      await service.upsert(orgId, screenId, { autoLaunchEnabled: false }, userId);

      expect((await service.getForScreen(orgId, screenId)).devmodePassphrase).toBe('AEBC72');
    });

    it('clears it when null is sent explicitly', async () => {
      await service.upsert(orgId, screenId, { devmodePassphrase: 'AEBC72' }, userId);

      await service.upsert(orgId, screenId, { devmodePassphrase: null }, userId);

      expect((await service.getForScreen(orgId, screenId)).devmodePassphrase).toBeNull();
      expect(await storedPassphrase()).toBeNull();
    });

    it('re-encrypts rather than double-encrypting on an unrelated save', async () => {
      await service.upsert(orgId, screenId, { devmodePassphrase: 'AEBC72' }, userId);

      await service.upsert(orgId, screenId, { ssapPort: 3000 }, userId);
      await service.upsert(orgId, screenId, { ssapPort: 3001 }, userId);

      expect((await service.getForScreen(orgId, screenId)).devmodePassphrase).toBe('AEBC72');
    });
  });

  describe('upsert', () => {
    it('creates the row on first write and updates it afterwards', async () => {
      await service.upsert(orgId, screenId, { localIp: '192.168.1.50' }, userId);
      await service.upsert(orgId, screenId, { localIp: '192.168.1.51' }, userId);

      const rows = await db
        .select()
        .from(screenRemoteControls)
        .where(eq(screenRemoteControls.screenId, screenId));
      expect(rows).toHaveLength(1);
      expect(rows[0].localIp).toBe('192.168.1.51');
    });

    it('assigns the screen to an agent', async () => {
      const config = await service.upsert(orgId, screenId, { agentId }, userId);

      expect(config.agentId).toBe(agentId);
    });

    it('detaches the screen when agentId is null', async () => {
      await service.upsert(orgId, screenId, { agentId }, userId);

      const config = await service.upsert(orgId, screenId, { agentId: null }, userId);

      expect(config.agentId).toBeNull();
    });

    it('refuses an agent from another organisation', async () => {
      const [foreign] = await db
        .insert(siteAgents)
        .values({ organisationId: otherOrgId, name: 'Theirs' })
        .returning();

      await expect(
        service.upsert(orgId, screenId, { agentId: foreign.id }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('refuses a screen from another organisation', async () => {
      const [foreign] = await db
        .insert(screens)
        .values({
          organisationId: otherOrgId,
          name: 'Theirs',
          resolution: '1920x1080',
          location: 'Elsewhere',
          apiKeyHash: 'hash',
        })
        .returning();

      await expect(
        service.upsert(orgId, foreign.id, { localIp: '10.0.0.1' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('audits which fields changed but never their values', async () => {
      await service.upsert(orgId, screenId, { devmodePassphrase: 'AEBC72' }, userId);

      const call = emitter.emit.mock.calls.find(
        ([name]) => name === AUDIT_SCREEN_REMOTE_CONTROL_UPDATED,
      );
      expect(call).toBeDefined();
      expect(call?.[1].details).toEqual({ changed: ['devmodePassphrase'] });
      expect(JSON.stringify(call?.[1])).not.toContain('AEBC72');
    });
  });

  describe('wake toggles need a MAC address', () => {
    it.each(['wakeBeforeScheduleEnabled', 'wakeOnUnreachableEnabled'] as const)(
      'refuses %s without one',
      async (field) => {
        await expect(service.upsert(orgId, screenId, { [field]: true }, userId)).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it('accepts the toggle when a MAC is sent in the same request', async () => {
      const config = await service.upsert(
        orgId,
        screenId,
        { macAddress: 'AA:BB:CC:DD:EE:FF', wakeBeforeScheduleEnabled: true },
        userId,
      );

      expect(config.wakeBeforeScheduleEnabled).toBe(true);
    });

    it('accepts the toggle when a MAC is already stored', async () => {
      await service.upsert(orgId, screenId, { macAddress: 'AA:BB:CC:DD:EE:FF' }, userId);

      const config = await service.upsert(
        orgId,
        screenId,
        { wakeOnUnreachableEnabled: true },
        userId,
      );

      expect(config.wakeOnUnreachableEnabled).toBe(true);
    });

    it('refuses clearing the MAC while a wake toggle is still on', async () => {
      await service.upsert(
        orgId,
        screenId,
        { macAddress: 'AA:BB:CC:DD:EE:FF', wakeBeforeScheduleEnabled: true },
        userId,
      );

      await expect(service.upsert(orgId, screenId, { macAddress: null }, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('isManagedBy', () => {
    it('is true only for the agent the screen is assigned to', async () => {
      const [other] = await db
        .insert(siteAgents)
        .values({ organisationId: orgId, name: 'Venue South' })
        .returning();
      await service.upsert(orgId, screenId, { agentId }, userId);

      expect(await service.isManagedBy(agentId, screenId)).toBe(true);
      expect(await service.isManagedBy(other.id, screenId)).toBe(false);
    });

    it('is false for a screen with no agent', async () => {
      await service.upsert(orgId, screenId, { localIp: '10.0.0.1' }, userId);

      expect(await service.isManagedBy(agentId, screenId)).toBe(false);
    });

    it('is false for a screen that was never configured', async () => {
      expect(await service.isManagedBy(agentId, screenId)).toBe(false);
    });
  });

  describe('listForAgent', () => {
    it('returns only that agent screens, with passphrases decrypted', async () => {
      const [second] = await db
        .insert(screens)
        .values({
          organisationId: orgId,
          name: 'Foyer right',
          resolution: '1920x1080',
          location: 'Foyer',
          apiKeyHash: 'hash',
        })
        .returning();
      const [other] = await db
        .insert(siteAgents)
        .values({ organisationId: orgId, name: 'Venue South' })
        .returning();
      await service.upsert(orgId, screenId, { agentId, devmodePassphrase: 'AEBC72' }, userId);
      await service.upsert(orgId, second.id, { agentId: other.id }, userId);

      const mine = await service.listForAgent(agentId);

      expect(mine).toHaveLength(1);
      expect(mine[0].screenId).toBe(screenId);
      expect(mine[0].devmodePassphrase).toBe('AEBC72');
    });
  });
});
