import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamStatus } from './live-stream-status.enum';
import { LiveStreamSourceType } from './live-stream-source-type.enum';
import { NdiQualityPreset } from './ndi-quality-preset.enum';
import { NdiEncoderPref } from './ndi-encoder-pref.enum';
import { FfmpegLiveService } from './ffmpeg-live.service';
import { NdiHlsStorageService } from './ndi-hls-storage.service';
import { ScreenGroupService } from '../screen-group/screen-group.service';
import { SiteAgentService } from '../site-agent/site-agent.service';
import { SiteAgentSseService } from '../site-agent/site-agent-sse.service';
import { CaptureLicenseRevokedEvent } from '../site-agent/capture-license-revoked.event';
import { CapturePluginAcceptanceService } from '../site-agent/capture-plugin-acceptance.service';
import { NdiStreamStatusService } from '../site-agent/ndi-stream-status.service';
import { SiteAgentCommandType } from '../site-agent/site-agent-command.enum';
import {
  AUDIT_LIVE_STREAM_CREATED,
  AUDIT_LIVE_STREAM_DEACTIVATED,
  AUDIT_LIVE_STREAM_PTZ,
} from '../audit-log/audit.events';
import type { PtzCommand } from './ptz-command';
import { PtzProtocol } from './ptz-protocol.enum';
import { DRIZZLE } from '../db/database.constants';
import {
  liveStreams,
  liveStreamActivations,
  organisations,
  screens,
  siteAgents,
  type LiveStream,
} from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import { OutboundGuard } from '../common/outbound-guard.service';
import type { CreateLiveStreamDto } from './dto/create-live-stream.dto';

describe('LiveStreamService (NDI)', () => {
  let service: LiveStreamService;
  let db: DrizzleDB;
  let ffmpeg: Record<string, jest.Mock>;
  let outbound: { assertUrl: jest.Mock };
  let sse: { isConnected: jest.Mock; push: jest.Mock };
  let ndiHls: { removeStreamDir: jest.Mock };
  let ndiStatus: NdiStreamStatusService;
  let capturePlugin: { assertNdiReady: jest.Mock };
  let emitter: { emit: jest.Mock };
  let siteAgentService: SiteAgentService;
  let orgId: string;
  let otherOrgId: string;
  let agentId: string;
  let foreignAgentId: string;
  let screenId: string;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  async function seedNdi(
    overrides: Partial<typeof liveStreams.$inferInsert> = {},
  ): Promise<LiveStream> {
    const [stream] = await db
      .insert(liveStreams)
      .values({
        organisationId: orgId,
        name: 'Stage cam',
        sourceType: LiveStreamSourceType.Ndi,
        sourceUrl: null,
        agentId,
        cameraHost: '192.168.1.50',
        ...overrides,
      })
      .returning();
    return stream;
  }

  const ndiDto = (overrides: Partial<CreateLiveStreamDto> = {}): CreateLiveStreamDto =>
    ({
      name: 'Stage cam',
      sourceType: LiveStreamSourceType.Ndi,
      agentId,
      cameraHost: '192.168.1.50',
      ...overrides,
    }) as CreateLiveStreamDto;

  beforeEach(async () => {
    await truncateAll();
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    const [other] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    otherOrgId = other.id;
    const [agent] = await db
      .insert(siteAgents)
      .values({ organisationId: orgId, name: 'Venue' })
      .returning();
    const [foreign] = await db
      .insert(siteAgents)
      .values({ organisationId: otherOrgId, name: 'Foreign' })
      .returning();
    agentId = agent.id;
    foreignAgentId = foreign.id;
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name: 'S1',
        resolution: '1920x1080',
        location: 'x',
        apiKeyHash: 'h',
      })
      .returning();
    screenId = screen.id;

    ffmpeg = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      probeSourceStream: jest.fn(),
      checkPassthroughCompatibility: jest.fn(),
    };
    outbound = { assertUrl: jest.fn().mockResolvedValue(undefined) };
    sse = { isConnected: jest.fn().mockReturnValue(true), push: jest.fn().mockReturnValue(true) };
    ndiHls = { removeStreamDir: jest.fn().mockResolvedValue(undefined) };
    emitter = { emit: jest.fn() };
    ndiStatus = new NdiStreamStatusService();
    capturePlugin = { assertNdiReady: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveStreamService,
        { provide: DRIZZLE, useValue: db },
        { provide: FfmpegLiveService, useValue: ffmpeg },
        { provide: ScreenGroupService, useValue: { findOne: jest.fn() } },
        { provide: EventEmitter2, useValue: emitter },
        { provide: OutboundGuard, useValue: outbound },
        { provide: SiteAgentSseService, useValue: sse },
        { provide: NdiHlsStorageService, useValue: ndiHls },
        { provide: NdiStreamStatusService, useValue: ndiStatus },
        { provide: CapturePluginAcceptanceService, useValue: capturePlugin },
        {
          provide: SiteAgentService,
          useValue: {
            findOne: jest.fn(async (org: string, id: string) => {
              const [row] = await db.select().from(siteAgents).where(eq(siteAgents.id, id));
              if (!row || row.organisationId !== org) {
                throw new NotFoundException('SiteAgent not found');
              }
              return row;
            }),
          },
        },
      ],
    }).compile();
    service = module.get(LiveStreamService);
    siteAgentService = module.get(SiteAgentService);
  });

  describe('create', () => {
    it('stores an NDI stream without a source URL and audits its binding', async () => {
      const stream = await service.createLiveStream(
        orgId,
        ndiDto({ ndiSourceName: '  CAM (Stage) ', qualityPreset: NdiQualityPreset.P1080 }),
        'user-1',
      );

      expect(stream).toEqual(
        expect.objectContaining({
          sourceType: 'ndi',
          sourceUrl: null,
          agentId,
          cameraHost: '192.168.1.50',
          ndiSourceName: 'CAM (Stage)',
          qualityPreset: '1080p30',
          encoderPref: 'auto',
        }),
      );
      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_LIVE_STREAM_CREATED,
        expect.objectContaining({
          details: expect.objectContaining({
            sourceType: 'ndi',
            sourceUrl: null,
            agentId,
            cameraHost: '192.168.1.50',
          }),
        }),
      );
    });

    it('answers 409 capture_plugin_not_ready and stores nothing when the plugin is not licensed', async () => {
      capturePlugin.assertNdiReady.mockRejectedValue(
        new ConflictException('capture_plugin_not_ready'),
      );

      await expect(service.createLiveStream(orgId, ndiDto())).rejects.toThrow(
        'capture_plugin_not_ready',
      );

      expect(capturePlugin.assertNdiReady).toHaveBeenCalledWith(agentId);
      expect(await db.$count(liveStreams)).toBe(0);
    });

    it('does not consult the plugin gate for a pull stream', async () => {
      await service.createLiveStream(orgId, {
        name: 'Pull',
        sourceUrl: 'rtmp://example.com/live/x',
        protocol: 'rtmp',
      } as CreateLiveStreamDto);

      expect(capturePlugin.assertNdiReady).not.toHaveBeenCalled();
    });

    it('stores an empty source name as null', async () => {
      const stream = await service.createLiveStream(orgId, ndiDto({ ndiSourceName: '   ' }));

      expect(stream.ndiSourceName).toBeNull();
    });

    it('rejects an agent of another organisation', async () => {
      await expect(
        service.createLiveStream(orgId, ndiDto({ agentId: foreignAgentId })),
      ).rejects.toThrow(NotFoundException);
      expect(await db.$count(liveStreams)).toBe(0);
    });

    it('creates a pull stream with null NDI binding', async () => {
      const stream = await service.createLiveStream(orgId, {
        name: 'Pull',
        sourceUrl: 'rtmp://example.com/live/k',
        protocol: 'rtmp',
      } as CreateLiveStreamDto);

      expect(stream).toEqual(
        expect.objectContaining({ sourceType: 'pull', agentId: null, cameraHost: null }),
      );
    });
  });

  describe('activateStream', () => {
    it('answers 409 when the agent is offline and changes nothing', async () => {
      const stream = await seedNdi();
      sse.isConnected.mockReturnValue(false);

      await expect(
        service.activateStream(orgId, stream.id, { targetScreenIds: [screenId] }),
      ).rejects.toThrow(new ConflictException('Site agent offline'));

      const [row] = await db.select().from(liveStreams).where(eq(liveStreams.id, stream.id));
      expect(row.status).toBe(LiveStreamStatus.Idle);
      expect(await db.$count(liveStreamActivations)).toBe(0);
      expect(sse.push).not.toHaveBeenCalled();
    });

    it('answers 409 capture_plugin_not_ready and changes nothing when the plugin is not licensed', async () => {
      const stream = await seedNdi();
      capturePlugin.assertNdiReady.mockRejectedValue(
        new ConflictException('capture_plugin_not_ready'),
      );

      await expect(
        service.activateStream(orgId, stream.id, { targetScreenIds: [screenId] }),
      ).rejects.toThrow('capture_plugin_not_ready');

      const [row] = await db.select().from(liveStreams).where(eq(liveStreams.id, stream.id));
      expect(row.status).toBe(LiveStreamStatus.Idle);
      expect(await db.$count(liveStreamActivations)).toBe(0);
      expect(sse.push).not.toHaveBeenCalled();
    });

    it('skips probe, reachability check and FFmpeg, and pushes reload_config', async () => {
      const stream = await seedNdi({ transcodingPreset: 'passthrough' as never });

      const result = await service.activateStream(orgId, stream.id, {
        targetScreenIds: [screenId],
      });

      expect(result.stream.status).toBe(LiveStreamStatus.Active);
      expect(ffmpeg.probeSourceStream).not.toHaveBeenCalled();
      expect(ffmpeg.start).not.toHaveBeenCalled();
      expect(outbound.assertUrl).not.toHaveBeenCalled();
      expect(sse.push).toHaveBeenCalledWith(
        agentId,
        expect.objectContaining({ type: SiteAgentCommandType.ReloadConfig }),
      );
    });

    it('still activates when the push finds the agent just gone', async () => {
      const stream = await seedNdi();
      sse.push.mockReturnValue(false);

      const result = await service.activateStream(orgId, stream.id, {
        targetScreenIds: [screenId],
      });

      expect(result.stream.status).toBe(LiveStreamStatus.Active);
    });

    it('rejects an NDI stream without an agent', async () => {
      const stream = await seedNdi({ agentId: null });

      await expect(
        service.activateStream(orgId, stream.id, { targetScreenIds: [screenId] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a pull stream without a source URL', async () => {
      const [stream] = await db
        .insert(liveStreams)
        .values({ organisationId: orgId, name: 'Broken', sourceUrl: null })
        .returning();

      await expect(
        service.activateStream(orgId, stream.id, { targetScreenIds: [screenId] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('stops a displaced NDI stream through its agent, not FFmpeg', async () => {
      const first = await seedNdi();
      await service.activateStream(orgId, first.id, { targetScreenIds: [screenId] });
      const second = await seedNdi({ name: 'Second' });
      sse.push.mockClear();

      await service.activateStream(orgId, second.id, { targetScreenIds: [screenId] });

      const [row] = await db.select().from(liveStreams).where(eq(liveStreams.id, first.id));
      expect(row.status).toBe(LiveStreamStatus.Idle);
      expect(ndiHls.removeStreamDir).toHaveBeenCalledWith(first.id);
      expect(ffmpeg.stop).not.toHaveBeenCalled();
      expect(sse.push).toHaveBeenCalledTimes(2);
    });

    it('stops a displaced pull stream through FFmpeg', async () => {
      const [pull] = await db
        .insert(liveStreams)
        .values({
          organisationId: orgId,
          name: 'Pull',
          sourceUrl: 'rtmp://example.com/x',
          status: LiveStreamStatus.Active,
        })
        .returning();
      await db.insert(liveStreamActivations).values({ streamId: pull.id, screenId });
      const ndi = await seedNdi();

      await service.activateStream(orgId, ndi.id, { targetScreenIds: [screenId] });

      expect(ffmpeg.stop).toHaveBeenCalledWith(pull.id);
    });
  });

  describe('handleCaptureLicenseRevoked', () => {
    it('deactivates the active NDI streams of that agent, with the revoke reason', async () => {
      const stream = await seedNdi();
      await service.activateStream(orgId, stream.id, { targetScreenIds: [screenId] });
      const idle = await seedNdi({ status: LiveStreamStatus.Idle });
      emitter.emit.mockClear();

      await service.handleCaptureLicenseRevoked(
        new CaptureLicenseRevokedEvent(agentId, orgId, 'user-1'),
      );

      const [row] = await db.select().from(liveStreams).where(eq(liveStreams.id, stream.id));
      expect(row.status).toBe(LiveStreamStatus.Idle);
      expect(await db.$count(liveStreamActivations)).toBe(0);
      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_LIVE_STREAM_DEACTIVATED,
        expect.objectContaining({
          userId: 'user-1',
          details: expect.objectContaining({ reason: 'capture_license_revoked' }),
        }),
      );
      const [untouched] = await db.select().from(liveStreams).where(eq(liveStreams.id, idle.id));
      expect(untouched.status).toBe(LiveStreamStatus.Idle);
    });

    it('leaves streams of other agents and organisations alone', async () => {
      const foreign = await seedNdi({
        agentId: foreignAgentId,
        organisationId: otherOrgId,
        status: LiveStreamStatus.Active,
      });

      await service.handleCaptureLicenseRevoked(
        new CaptureLicenseRevokedEvent(agentId, orgId, 'u'),
      );

      const [row] = await db.select().from(liveStreams).where(eq(liveStreams.id, foreign.id));
      expect(row.status).toBe(LiveStreamStatus.Active);
    });

    it('keeps going when one stream fails to deactivate', async () => {
      const first = await seedNdi({ status: LiveStreamStatus.Active });
      const second = await seedNdi({ status: LiveStreamStatus.Active });
      ndiHls.removeStreamDir.mockRejectedValueOnce(new Error('disk'));

      await service.handleCaptureLicenseRevoked(
        new CaptureLicenseRevokedEvent(agentId, orgId, 'u'),
      );

      const rows = await db.select().from(liveStreams).where(eq(liveStreams.agentId, agentId));
      expect(rows.map((r) => r.id).sort()).toEqual([first.id, second.id].sort());
      expect(rows.filter((r) => r.status === LiveStreamStatus.Idle).length).toBeGreaterThanOrEqual(
        1,
      );
    });
  });

  describe('deactivateStream', () => {
    it('removes the HLS files, forgets the status and tells the agent', async () => {
      const stream = await seedNdi();
      await service.activateStream(orgId, stream.id, { targetScreenIds: [screenId] });
      ndiStatus.record(agentId, [{ streamId: stream.id, state: 'streaming', framesDropped: 0 }]);
      sse.push.mockClear();

      const saved = await service.deactivateStream(orgId, stream.id);

      expect(saved.status).toBe(LiveStreamStatus.Idle);
      expect(ndiHls.removeStreamDir).toHaveBeenCalledWith(stream.id);
      expect(ndiStatus.get(stream.id, agentId)).toBeUndefined();
      expect(ffmpeg.stop).not.toHaveBeenCalled();
      expect(sse.push).toHaveBeenCalledWith(
        agentId,
        expect.objectContaining({ type: SiteAgentCommandType.ReloadConfig }),
      );
    });

    it('stops FFmpeg for a pull stream', async () => {
      const [pull] = await db
        .insert(liveStreams)
        .values({ organisationId: orgId, name: 'Pull', sourceUrl: 'rtmp://example.com/x' })
        .returning();

      await service.deactivateStream(orgId, pull.id);

      expect(ffmpeg.stop).toHaveBeenCalledWith(pull.id);
      expect(sse.push).not.toHaveBeenCalled();
    });
  });

  describe('updateLiveStream', () => {
    it('pushes reload_config when the preset of an active stream changes', async () => {
      const stream = await seedNdi({ status: LiveStreamStatus.Active });

      const saved = await service.updateLiveStream(orgId, stream.id, {
        qualityPreset: NdiQualityPreset.Preview,
        encoderPref: NdiEncoderPref.Software,
        cameraHost: '192.168.1.60',
      });

      expect(saved).toEqual(
        expect.objectContaining({
          qualityPreset: 'preview',
          encoderPref: 'software',
          cameraHost: '192.168.1.60',
        }),
      );
      expect(sse.push).toHaveBeenCalledWith(
        agentId,
        expect.objectContaining({ type: SiteAgentCommandType.ReloadConfig }),
      );
    });

    it('does not push for an idle stream', async () => {
      const stream = await seedNdi();

      await service.updateLiveStream(orgId, stream.id, { name: 'Renamed' });

      expect(sse.push).not.toHaveBeenCalled();
    });

    it('blocks moving an active stream to another agent', async () => {
      const stream = await seedNdi({ status: LiveStreamStatus.Active });
      const [second] = await db
        .insert(siteAgents)
        .values({ organisationId: orgId, name: 'B' })
        .returning();

      await expect(
        service.updateLiveStream(orgId, stream.id, { agentId: second.id }),
      ).rejects.toThrow(ConflictException);
    });

    it('moves an idle stream to another agent of the organisation and drops the old status', async () => {
      const stream = await seedNdi();
      const [second] = await db
        .insert(siteAgents)
        .values({ organisationId: orgId, name: 'B' })
        .returning();
      ndiStatus.record(agentId, [{ streamId: stream.id, state: 'error', framesDropped: 0 }]);

      const saved = await service.updateLiveStream(orgId, stream.id, { agentId: second.id });

      expect(saved.agentId).toBe(second.id);
      expect(ndiStatus.get(stream.id, agentId)).toBeUndefined();
    });

    it('rejects an agent of another organisation', async () => {
      const stream = await seedNdi();

      await expect(
        service.updateLiveStream(orgId, stream.id, { agentId: foreignAgentId }),
      ).rejects.toThrow(NotFoundException);
      expect(siteAgentService.findOne).toHaveBeenCalledWith(orgId, foreignAgentId);
    });

    it('clears the source name when an empty one is sent', async () => {
      const stream = await seedNdi({ ndiSourceName: 'CAM' });

      const saved = await service.updateLiveStream(orgId, stream.id, { ndiSourceName: ' ' });

      expect(saved.ndiSourceName).toBeNull();
    });

    it('refuses to change the source type', async () => {
      const stream = await seedNdi();

      await expect(
        service.updateLiveStream(orgId, stream.id, { sourceType: LiveStreamSourceType.Pull }),
      ).rejects.toThrow(BadRequestException);
    });

    it('still refuses to update an active pull stream', async () => {
      const [pull] = await db
        .insert(liveStreams)
        .values({
          organisationId: orgId,
          name: 'Pull',
          sourceUrl: 'rtmp://example.com/x',
          status: LiveStreamStatus.Active,
        })
        .returning();

      await expect(service.updateLiveStream(orgId, pull.id, { name: 'x' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('ignores NDI fields on a pull stream and returns it unchanged for an empty patch', async () => {
      const [pull] = await db
        .insert(liveStreams)
        .values({ organisationId: orgId, name: 'Pull', sourceUrl: 'rtmp://example.com/x' })
        .returning();

      const unchanged = await service.updateLiveStream(orgId, pull.id, {
        cameraHost: '10.0.0.1',
        qualityPreset: NdiQualityPreset.Preview,
      });
      const renamed = await service.updateLiveStream(orgId, pull.id, {
        name: 'Renamed',
        sourceUrl: 'rtmp://example.com/y',
      });

      expect(unchanged.cameraHost).toBeNull();
      expect(renamed).toEqual(
        expect.objectContaining({ name: 'Renamed', sourceUrl: 'rtmp://example.com/y' }),
      );
    });
  });

  describe('findActiveNdiStreamForAgent', () => {
    it('finds the active stream bound to the agent', async () => {
      const stream = await seedNdi({ status: LiveStreamStatus.Active });

      const found = await service.findActiveNdiStreamForAgent(orgId, agentId, stream.id);

      expect(found.id).toBe(stream.id);
    });

    it('answers not found for idle, foreign-org, foreign-agent and pull streams', async () => {
      const idle = await seedNdi();
      const active = await seedNdi({ status: LiveStreamStatus.Active });
      const [pull] = await db
        .insert(liveStreams)
        .values({
          organisationId: orgId,
          name: 'Pull',
          sourceUrl: 'rtmp://example.com/x',
          agentId,
          status: LiveStreamStatus.Active,
        })
        .returning();

      await expect(service.findActiveNdiStreamForAgent(orgId, agentId, idle.id)).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        service.findActiveNdiStreamForAgent(otherOrgId, agentId, active.id),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findActiveNdiStreamForAgent(orgId, foreignAgentId, active.id),
      ).rejects.toThrow(NotFoundException);
      await expect(service.findActiveNdiStreamForAgent(orgId, agentId, pull.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PTZ fields', () => {
    it('defaults to PTZ off on creation', async () => {
      const stream = await service.createLiveStream(orgId, ndiDto());

      expect(stream).toEqual(
        expect.objectContaining({ ptzEnabled: false, ptzProtocol: 'visca_udp', ptzPort: null }),
      );
    });

    it('stores PTZ settings on creation', async () => {
      const stream = await service.createLiveStream(
        orgId,
        ndiDto({ ptzEnabled: true, ptzProtocol: PtzProtocol.ViscaTcp, ptzPort: 5679 }),
      );

      expect(stream).toEqual(
        expect.objectContaining({ ptzEnabled: true, ptzProtocol: 'visca_tcp', ptzPort: 5679 }),
      );
    });

    it('pushes reload_config when PTZ settings of an active stream change', async () => {
      const stream = await seedNdi({ status: LiveStreamStatus.Active });

      const saved = await service.updateLiveStream(orgId, stream.id, {
        ptzEnabled: true,
        ptzPort: 1234,
      });

      expect(saved).toEqual(expect.objectContaining({ ptzEnabled: true, ptzPort: 1234 }));
      expect(sse.push).toHaveBeenCalledWith(
        agentId,
        expect.objectContaining({ type: SiteAgentCommandType.ReloadConfig }),
      );
    });

    it('clears the port with null', async () => {
      const stream = await seedNdi({ ptzPort: 1234 });

      const saved = await service.updateLiveStream(orgId, stream.id, {
        ptzPort: null as unknown as undefined,
      });

      expect(saved.ptzPort).toBeNull();
    });
  });

  describe('sendPtzCommand', () => {
    const move: PtzCommand = { action: 'move', direction: 'left', speed: 5 };

    const seedPtz = (overrides: Partial<typeof liveStreams.$inferInsert> = {}) =>
      seedNdi({ status: LiveStreamStatus.Active, ptzEnabled: true, ...overrides });

    it('pushes the command with the stream id and no address', async () => {
      const stream = await seedPtz();

      await service.sendPtzCommand(orgId, stream.id, move, 'user-1');

      expect(sse.push).toHaveBeenCalledWith(agentId, {
        commandId: expect.any(String),
        type: SiteAgentCommandType.Ptz,
        streamId: stream.id,
        ptz: move,
      });
      expect(JSON.stringify(sse.push.mock.calls[0][1])).not.toContain('192.168');
    });

    it.each<PtzCommand>([
      { action: 'move', direction: 'up', speed: 3 },
      { action: 'stop' },
      { action: 'zoom', direction: 'in', speed: 2 },
    ])('does not audit $action', async (command) => {
      const stream = await seedPtz();

      await service.sendPtzCommand(orgId, stream.id, command, 'user-1');

      expect(emitter.emit).not.toHaveBeenCalledWith(AUDIT_LIVE_STREAM_PTZ, expect.anything());
    });

    it.each<PtzCommand>([
      { action: 'home' },
      { action: 'preset_recall', preset: 3 },
      { action: 'preset_store', preset: 4 },
    ])('audits $action', async (command) => {
      const stream = await seedPtz();

      await service.sendPtzCommand(orgId, stream.id, command, 'user-1');

      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_LIVE_STREAM_PTZ,
        expect.objectContaining({
          streamId: stream.id,
          organisationId: orgId,
          userId: 'user-1',
          details: expect.objectContaining({ ...command, streamName: 'Stage cam' }),
        }),
      );
    });

    it('answers 404 for a stream of another organisation', async () => {
      const stream = await seedPtz();

      await expect(service.sendPtzCommand(otherOrgId, stream.id, move)).rejects.toThrow(
        NotFoundException,
      );
      expect(sse.push).not.toHaveBeenCalled();
    });

    it('answers 409 when PTZ is disabled', async () => {
      const stream = await seedPtz({ ptzEnabled: false });

      await expect(service.sendPtzCommand(orgId, stream.id, move)).rejects.toThrow(
        ConflictException,
      );
      expect(sse.push).not.toHaveBeenCalled();
    });

    it('answers 409 for a pull stream', async () => {
      const [pull] = await db
        .insert(liveStreams)
        .values({
          organisationId: orgId,
          name: 'Pull',
          sourceUrl: 'rtmp://example.com/x',
          status: LiveStreamStatus.Active,
          ptzEnabled: true,
        })
        .returning();

      await expect(service.sendPtzCommand(orgId, pull.id, move)).rejects.toThrow(ConflictException);
    });

    it('answers 409 when the stream is not active', async () => {
      const stream = await seedPtz({ status: LiveStreamStatus.Idle });

      await expect(service.sendPtzCommand(orgId, stream.id, move)).rejects.toThrow(
        ConflictException,
      );
    });

    it('answers 409 and audits nothing when the agent is offline', async () => {
      const stream = await seedPtz();
      sse.push.mockReturnValue(false);

      await expect(
        service.sendPtzCommand(orgId, stream.id, { action: 'home' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
      expect(emitter.emit).not.toHaveBeenCalledWith(AUDIT_LIVE_STREAM_PTZ, expect.anything());
    });
  });

  describe('removeLiveStream', () => {
    it('drops the reported status of a deleted NDI stream', async () => {
      const stream = await seedNdi();
      ndiStatus.record(agentId, [{ streamId: stream.id, state: 'error', framesDropped: 0 }]);

      await service.removeLiveStream(orgId, stream.id);

      expect(ndiStatus.get(stream.id, agentId)).toBeUndefined();
    });
  });
});
