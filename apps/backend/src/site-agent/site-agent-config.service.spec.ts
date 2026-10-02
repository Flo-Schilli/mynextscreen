import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { SiteAgentConfigService } from './site-agent-config.service';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import { toDashboardDto, MASKED_SECRET } from './screen-remote-control.dto-mapper';
import { ScheduleBoundaryService } from '../screen/schedule-boundary.service';
import { SecretCipher } from '../common/secret-cipher.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screenRemoteControls, screens, siteAgents } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('SiteAgentConfigService', () => {
  let db: DrizzleDB;
  let service: SiteAgentConfigService;
  let remoteControls: ScreenRemoteControlService;
  let boundaries: { getNextStart: jest.Mock };
  let orgId: string;
  let agentId: string;
  let screenId: string;

  const userId = '880e8400-e29b-41d4-a716-446655440000';
  const encryptionKey = Buffer.alloc(32, 7).toString('base64');
  const configValues: Record<string, unknown> = {};

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    boundaries = { getNextStart: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteAgentConfigService,
        ScreenRemoteControlService,
        SecretCipher,
        { provide: DRIZZLE, useValue: db },
        { provide: ScheduleBoundaryService, useValue: boundaries },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: unknown) =>
              key === 'SECRETS_ENCRYPTION_KEY' ? encryptionKey : (configValues[key] ?? fallback),
            ),
          },
        },
      ],
    }).compile();
    service = module.get(SiteAgentConfigService);
    remoteControls = module.get(ScreenRemoteControlService);

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    const [agent] = await db
      .insert(siteAgents)
      .values({ organisationId: orgId, name: 'Venue North' })
      .returning();
    agentId = agent.id;
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
  });

  describe('buildAgentConfig', () => {
    it('returns an empty screen list for an agent with nothing assigned', async () => {
      const config = await service.buildAgentConfig(agentId);

      expect(config.agentId).toBe(agentId);
      expect(config.organisationId).toBe(orgId);
      expect(config.screens).toEqual([]);
    });

    it('carries the defaults an agent needs to start working', async () => {
      const config = await service.buildAgentConfig(agentId);

      expect(config.probeIntervalMs).toBe(60_000);
      expect(config.appId).toBe('com.mynextscreen.webos');
    });

    it('includes the screens assigned to it, with their name', async () => {
      await remoteControls.upsert(orgId, screenId, { agentId, localIp: '192.168.1.50' }, userId);

      const config = await service.buildAgentConfig(agentId);

      expect(config.screens).toHaveLength(1);
      expect(config.screens[0].screenId).toBe(screenId);
      expect(config.screens[0].name).toBe('Foyer left');
      expect(config.screens[0].localIp).toBe('192.168.1.50');
    });

    it('excludes screens assigned to another agent', async () => {
      const [other] = await db
        .insert(siteAgents)
        .values({ organisationId: orgId, name: 'Venue South' })
        .returning();
      await remoteControls.upsert(orgId, screenId, { agentId: other.id }, userId);

      expect((await service.buildAgentConfig(agentId)).screens).toEqual([]);
    });
  });

  describe('the passphrase asymmetry', () => {
    beforeEach(async () => {
      await remoteControls.upsert(
        orgId,
        screenId,
        { agentId, devmodePassphrase: 'AEBC72' },
        userId,
      );
    });

    // The agent cannot decrypt the TV's key without it, so this one payload
    // must carry it in the clear.
    it('gives the agent the passphrase in plaintext', async () => {
      const config = await service.buildAgentConfig(agentId);

      expect(config.screens[0].devmodePassphrase).toBe('AEBC72');
    });

    // ...and the dashboard's view of the very same row must not.
    it('masks it on the dashboard view of the same row', async () => {
      const dashboard = toDashboardDto(await remoteControls.getForScreen(orgId, screenId), null);

      expect(dashboard.devmodePassphrase).toBe(MASKED_SECRET);
    });

    it('sends null when no passphrase is configured', async () => {
      await remoteControls.upsert(orgId, screenId, { devmodePassphrase: null }, userId);

      const config = await service.buildAgentConfig(agentId);

      expect(config.screens[0].devmodePassphrase).toBeNull();
    });
  });

  describe('playerHeartbeatStale', () => {
    beforeEach(async () => {
      await remoteControls.upsert(orgId, screenId, { agentId }, userId);
    });

    // A screen that never checked in has no app running — which is exactly the
    // state the agent exists to fix.
    it('is true for a screen that has never sent a heartbeat', async () => {
      const config = await service.buildAgentConfig(agentId);

      expect(config.screens[0].playerHeartbeatStale).toBe(true);
    });

    it('is false right after a heartbeat', async () => {
      await db.update(screens).set({ lastHeartbeat: new Date() }).where(eq(screens.id, screenId));

      const config = await service.buildAgentConfig(agentId);

      expect(config.screens[0].playerHeartbeatStale).toBe(false);
    });

    it('is true once the heartbeat is older than the offline threshold', async () => {
      await db
        .update(screens)
        .set({ lastHeartbeat: new Date(Date.now() - 600_000) })
        .where(eq(screens.id, screenId));

      const config = await service.buildAgentConfig(agentId);

      expect(config.screens[0].playerHeartbeatStale).toBe(true);
    });
  });

  describe('nextScheduleStartAt', () => {
    it('is resolved when the screen is set to wake before a schedule', async () => {
      const start = new Date(Date.now() + 3_600_000);
      boundaries.getNextStart.mockResolvedValue(start);
      await remoteControls.upsert(
        orgId,
        screenId,
        { agentId, macAddress: 'AA:BB:CC:DD:EE:FF', wakeBeforeScheduleEnabled: true },
        userId,
      );

      const config = await service.buildAgentConfig(agentId);

      expect(config.screens[0].nextScheduleStartAt).toBe(start.toISOString());
    });

    // The lookup walks every schedule entry of the screen and its group; doing
    // that for a screen that will never act on the answer is pure cost.
    it('is not even computed when the screen does not wake before a schedule', async () => {
      await remoteControls.upsert(orgId, screenId, { agentId }, userId);

      const config = await service.buildAgentConfig(agentId);

      expect(config.screens[0].nextScheduleStartAt).toBeNull();
      expect(boundaries.getNextStart).not.toHaveBeenCalled();
    });

    it('is null when nothing is scheduled in the look-ahead window', async () => {
      boundaries.getNextStart.mockResolvedValue(null);
      await remoteControls.upsert(
        orgId,
        screenId,
        { agentId, macAddress: 'AA:BB:CC:DD:EE:FF', wakeBeforeScheduleEnabled: true },
        userId,
      );

      const config = await service.buildAgentConfig(agentId);

      expect(config.screens[0].nextScheduleStartAt).toBeNull();
    });
  });

  describe('lastDevmodeExtendAt', () => {
    // Without it, a restarted agent would see "never extended" and hit every TV
    // with an SSH session on boot.
    it('is passed through so a restart does not re-extend immediately', async () => {
      await remoteControls.upsert(orgId, screenId, { agentId }, userId);
      const when = new Date(Date.now() - 86_400_000);
      await db
        .update(screenRemoteControls)
        .set({ lastDevmodeExtendAt: when })
        .where(eq(screenRemoteControls.screenId, screenId));

      const config = await service.buildAgentConfig(agentId);

      expect(config.screens[0].lastDevmodeExtendAt).toBe(when.toISOString());
    });
  });
});
