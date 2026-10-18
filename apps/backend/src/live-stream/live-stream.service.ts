import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { and, eq, inArray } from 'drizzle-orm';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  liveStreams,
  liveStreamActivations,
  screens,
  type LiveStream,
  type NewLiveStream,
} from '../db/schema';
import { LiveStreamStatus } from './live-stream-status.enum';
import { LiveStreamSourceType } from './live-stream-source-type.enum';
import { NdiHlsStorageService } from './ndi-hls-storage.service';
import { SiteAgentService } from '../site-agent/site-agent.service';
import { SiteAgentSseService } from '../site-agent/site-agent-sse.service';
import { NdiStreamStatusService } from '../site-agent/ndi-stream-status.service';
import { SiteAgentCommandType } from '../site-agent/site-agent-command.enum';
import { CreateLiveStreamDto } from './dto/create-live-stream.dto';
import { UpdateLiveStreamDto } from './dto/update-live-stream.dto';
import { ActivateLiveStreamDto } from './dto/activate-live-stream.dto';
import {
  FfmpegLiveService,
  LIVE_STREAM_PROCESS_EXITED,
  LiveStreamProcessExitedEvent,
} from './ffmpeg-live.service';
import { TranscodingPreset } from './transcoding-preset.enum';
import { ScreenGroupService } from '../screen-group/screen-group.service';
import {
  LIVE_STREAM_STARTED,
  LIVE_STREAM_STOPPED,
  ScreenStateChangeEvent,
} from '../screen/screen-state.event';
import {
  AUDIT_LIVE_STREAM_CREATED,
  AUDIT_LIVE_STREAM_UPDATED,
  AUDIT_LIVE_STREAM_DELETED,
  AUDIT_LIVE_STREAM_ACTIVATED,
  AUDIT_LIVE_STREAM_DEACTIVATED,
  AUDIT_LIVE_STREAM_FAILED,
  AuditLiveStreamEvent,
} from '../audit-log/audit.events';
import { OutboundGuard } from '../common/outbound-guard.service';
import { LIVE_STREAM_SCHEMES } from './live-stream-schemes';

export interface ActivateStreamResult {
  stream: LiveStream;
  warnings: string[];
}

@Injectable()
export class LiveStreamService extends OrganisationScopedService<LiveStream> {
  private readonly logger = new Logger(LiveStreamService.name);

  constructor(
    @Inject(DRIZZLE) db: DrizzleDB,
    private readonly ffmpegLiveService: FfmpegLiveService,
    private readonly outbound: OutboundGuard,
    private readonly screenGroupService: ScreenGroupService,
    private readonly eventEmitter: EventEmitter2,
    private readonly siteAgentService: SiteAgentService,
    private readonly siteAgentSse: SiteAgentSseService,
    private readonly ndiHls: NdiHlsStorageService,
    private readonly ndiStatus: NdiStreamStatusService,
  ) {
    super(db, liveStreams, 'LiveStream');
  }

  /**
   * The active NDI stream an agent is allowed to upload for. One answer for
   * "does not exist", "someone else's" and "not active": the caller must not
   * learn which of those it hit.
   */
  async findActiveNdiStreamForAgent(
    organisationId: string,
    agentId: string,
    streamId: string,
  ): Promise<LiveStream> {
    const [stream] = await this.db
      .select()
      .from(liveStreams)
      .where(
        and(
          eq(liveStreams.id, streamId),
          eq(liveStreams.organisationId, organisationId),
          eq(liveStreams.agentId, agentId),
          eq(liveStreams.sourceType, LiveStreamSourceType.Ndi),
          eq(liveStreams.status, LiveStreamStatus.Active),
        ),
      )
      .limit(1);
    if (!stream) {
      throw new NotFoundException('Live stream not found');
    }
    return stream;
  }

  async createLiveStream(
    organisationId: string,
    dto: CreateLiveStreamDto,
    userId: string | null = null,
  ): Promise<LiveStream> {
    const stream = await this.create(
      organisationId,
      await this.toInsertValues(organisationId, dto),
    );

    this.eventEmitter.emit(
      AUDIT_LIVE_STREAM_CREATED,
      new AuditLiveStreamEvent(stream.id, organisationId, userId, {
        streamId: stream.id,
        streamName: stream.name,
        sourceType: stream.sourceType,
        sourceUrl: stream.sourceUrl ?? null,
        protocol: stream.protocol,
        agentId: stream.agentId ?? null,
        cameraHost: stream.cameraHost ?? null,
      }),
    );

    return stream;
  }

  async updateLiveStream(
    organisationId: string,
    id: string,
    dto: UpdateLiveStreamDto,
    userId: string | null = null,
  ): Promise<LiveStream> {
    const stream = await this.findOne(organisationId, id);
    const isNdi = stream.sourceType === LiveStreamSourceType.Ndi;
    const isActive = stream.status === LiveStreamStatus.Active;

    // A pull stream's FFmpeg is already running with the old settings; an NDI
    // stream's agent is told to re-read its config instead.
    if (isActive && !isNdi) {
      throw new ConflictException(
        'Cannot update a live stream that is currently active. Deactivate the stream first.',
      );
    }
    if (dto.sourceType && dto.sourceType !== stream.sourceType) {
      throw new BadRequestException('The source type of a live stream cannot be changed.');
    }
    if (isActive && dto.agentId && dto.agentId !== stream.agentId) {
      throw new ConflictException(
        'Cannot move an active live stream to another site agent. Deactivate the stream first.',
      );
    }

    const patch = await this.toUpdateValues(organisationId, stream, dto);
    if (Object.keys(patch).length === 0) {
      return stream;
    }

    const [saved] = await this.db
      .update(liveStreams)
      .set(patch)
      .where(and(eq(liveStreams.id, id), eq(liveStreams.organisationId, organisationId)))
      .returning();

    if (isNdi && saved.agentId !== stream.agentId) {
      this.ndiStatus.clear(id, stream.agentId);
    }
    if (isNdi && isActive) {
      this.pushReloadConfig(saved.agentId);
    }

    this.eventEmitter.emit(
      AUDIT_LIVE_STREAM_UPDATED,
      new AuditLiveStreamEvent(id, organisationId, userId, {
        streamId: id,
        streamName: saved.name,
        sourceType: saved.sourceType,
        sourceUrl: saved.sourceUrl ?? null,
        protocol: saved.protocol,
        agentId: saved.agentId ?? null,
        cameraHost: saved.cameraHost ?? null,
      }),
    );

    return saved;
  }

  async removeLiveStream(
    organisationId: string,
    id: string,
    userId: string | null = null,
  ): Promise<void> {
    const stream = await this.findOne(organisationId, id);

    if (stream.status === LiveStreamStatus.Active) {
      throw new ConflictException(
        'Cannot delete a live stream that is currently active. Deactivate the stream first.',
      );
    }

    const { id: streamId, name: streamName, sourceUrl, protocol } = stream;
    this.ndiStatus.clear(streamId, stream.agentId);

    await this.db
      .delete(liveStreams)
      .where(and(eq(liveStreams.id, id), eq(liveStreams.organisationId, organisationId)));

    this.eventEmitter.emit(
      AUDIT_LIVE_STREAM_DELETED,
      new AuditLiveStreamEvent(streamId, organisationId, userId, {
        streamId,
        streamName,
        sourceUrl: sourceUrl ?? null,
        protocol,
      }),
    );
  }

  async activateStream(
    organisationId: string,
    id: string,
    dto: ActivateLiveStreamDto,
    userId: string | null = null,
  ): Promise<ActivateStreamResult> {
    // Validate exactly one target is provided
    const hasScreenIds = dto.targetScreenIds && dto.targetScreenIds.length > 0;
    const hasGroupId = !!dto.targetGroupId;

    if (!hasScreenIds && !hasGroupId) {
      throw new BadRequestException('Either targetScreenIds or targetGroupId must be provided.');
    }

    if (hasScreenIds && hasGroupId) {
      throw new BadRequestException('Provide either targetScreenIds or targetGroupId, not both.');
    }

    const stream = await this.findOne(organisationId, id);

    // Probe source stream for passthrough compatibility
    let warnings: string[] = [];
    const isNdi = stream.sourceType === LiveStreamSourceType.Ndi;
    if (!isNdi && stream.transcodingPreset === TranscodingPreset.Passthrough) {
      try {
        const probeResult = await this.ffmpegLiveService.probeSourceStream(
          this.requireSourceUrl(stream),
          stream.protocol,
        );
        const compatibility = this.ffmpegLiveService.checkPassthroughCompatibility(probeResult);
        warnings = compatibility.warnings;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.warn(
          `[stream:${id}] Failed to probe source for passthrough compatibility: ${message}`,
        );
        warnings = [
          'Could not probe source stream — passthrough compatibility could not be verified.',
        ];
      }
    }

    // Resolve target screen IDs
    let targetScreenIds: string[];

    if (hasGroupId) {
      const group = await this.screenGroupService.findOne(organisationId, dto.targetGroupId!);
      targetScreenIds = group.screens.map((s) => s.id);

      if (targetScreenIds.length === 0) {
        throw new BadRequestException('The target screen group has no member screens.');
      }
    } else {
      targetScreenIds = dto.targetScreenIds!;
    }

    // Validate all target screens belong to the current org
    const targetScreens = await this.db
      .select()
      .from(screens)
      .where(and(inArray(screens.id, targetScreenIds), eq(screens.organisationId, organisationId)));

    if (targetScreens.length !== targetScreenIds.length) {
      const foundIds = new Set(targetScreens.map((s) => s.id));
      const missing = targetScreenIds.filter((screenId) => !foundIds.has(screenId));
      throw new ForbiddenException(
        `The following screen IDs do not belong to this organisation or do not exist: ${missing.join(', ')}`,
      );
    }

    if (isNdi) {
      // Fail fast, before any state changes: a stream that is "active" with no
      // agent to feed it would just show a black screen.
      this.assertAgentConnected(stream);
    } else {
      await this.startPullIngest(stream);
    }

    // Handle duplicate overrides: deactivate any previous stream on these screens
    const existingActivations = await this.db
      .select()
      .from(liveStreamActivations)
      .where(inArray(liveStreamActivations.screenId, targetScreenIds));

    if (existingActivations.length > 0) {
      // Group by streamId to check if we need to clean up other streams
      const otherStreamIds = new Set(
        existingActivations.filter((a) => a.streamId !== id).map((a) => a.streamId),
      );

      // Remove existing activations for these screens
      await this.db.delete(liveStreamActivations).where(
        inArray(
          liveStreamActivations.id,
          existingActivations.map((a) => a.id),
        ),
      );

      // For each other stream that lost all its screens, set status back to idle and stop FFmpeg
      for (const otherStreamId of otherStreamIds) {
        const remainingCount = await this.db.$count(
          liveStreamActivations,
          eq(liveStreamActivations.streamId, otherStreamId),
        );

        if (remainingCount === 0) {
          const [otherStream] = await this.db
            .update(liveStreams)
            .set({ status: LiveStreamStatus.Idle })
            .where(eq(liveStreams.id, otherStreamId))
            .returning();
          if (otherStream) {
            await this.stopIngest(otherStream);
          }
        }
      }
    }

    // Create activation records
    await this.db.insert(liveStreamActivations).values(
      targetScreenIds.map((screenId) => ({
        streamId: id,
        screenId,
      })),
    );

    // Update stream status
    const [saved] = await this.db
      .update(liveStreams)
      .set({ status: LiveStreamStatus.Active })
      .where(eq(liveStreams.id, id))
      .returning();

    // The agent reconciles against its config, which now lists this stream.
    if (isNdi) {
      this.pushReloadConfig(saved.agentId);
    }

    // Send SSE events to target screens
    for (const screenId of targetScreenIds) {
      this.eventEmitter.emit(
        LIVE_STREAM_STARTED,
        new ScreenStateChangeEvent(screenId, organisationId),
      );
    }

    // Emit audit event
    this.eventEmitter.emit(
      AUDIT_LIVE_STREAM_ACTIVATED,
      new AuditLiveStreamEvent(id, organisationId, userId, {
        streamId: id,
        streamName: stream.name,
        sourceType: stream.sourceType,
        protocol: stream.protocol,
        targetScreenIds,
        ...(dto.targetGroupId ? { targetGroupId: dto.targetGroupId } : {}),
      }),
    );

    return { stream: saved, warnings };
  }

  async deactivateStream(
    organisationId: string,
    id: string,
    userId: string | null = null,
  ): Promise<LiveStream> {
    const stream = await this.findOne(organisationId, id);

    // Resolve active target screens before clearing
    const activations = await this.db
      .select()
      .from(liveStreamActivations)
      .where(eq(liveStreamActivations.streamId, id));
    const targetScreenIds = activations.map((a) => a.screenId);

    // Clear activation records
    if (activations.length > 0) {
      await this.db.delete(liveStreamActivations).where(eq(liveStreamActivations.streamId, id));
    }

    // Set status back to idle
    const [saved] = await this.db
      .update(liveStreams)
      .set({ status: LiveStreamStatus.Idle })
      .where(eq(liveStreams.id, id))
      .returning();

    // After the status flip, so an NDI agent re-reading its config no longer
    // finds the stream. Safe even if nothing is running.
    await this.stopIngest(stream);

    // Send SSE stop events to previously targeted screens
    for (const screenId of targetScreenIds) {
      this.eventEmitter.emit(
        LIVE_STREAM_STOPPED,
        new ScreenStateChangeEvent(screenId, organisationId),
      );
    }

    // Emit audit event
    this.eventEmitter.emit(
      AUDIT_LIVE_STREAM_DEACTIVATED,
      new AuditLiveStreamEvent(id, organisationId, userId, {
        streamId: id,
        streamName: stream.name,
        reason: 'manual',
      }),
    );

    return saved;
  }

  @OnEvent(LIVE_STREAM_PROCESS_EXITED)
  async handleUnplannedExit(event: LiveStreamProcessExitedEvent): Promise<void> {
    this.logger.warn(
      `Handling unplanned exit for stream ${event.streamId} (exit code: ${event.exitCode})`,
    );

    // Find the stream — it may have been deleted between the exit and this handler
    const [stream] = await this.db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.id, event.streamId))
      .limit(1);

    if (!stream) {
      return;
    }

    // Resolve active target screens
    const activations = await this.db
      .select()
      .from(liveStreamActivations)
      .where(eq(liveStreamActivations.streamId, event.streamId));
    const targetScreenIds = activations.map((a) => a.screenId);

    // Clear activation records
    if (activations.length > 0) {
      await this.db
        .delete(liveStreamActivations)
        .where(eq(liveStreamActivations.streamId, event.streamId));
    }

    // Set status to error
    await this.db
      .update(liveStreams)
      .set({ status: LiveStreamStatus.Error })
      .where(eq(liveStreams.id, event.streamId));

    // Send SSE stop events to previously targeted screens
    for (const screenId of targetScreenIds) {
      this.eventEmitter.emit(
        LIVE_STREAM_STOPPED,
        new ScreenStateChangeEvent(screenId, stream.organisationId),
      );
    }

    // Emit audit event
    this.eventEmitter.emit(
      AUDIT_LIVE_STREAM_FAILED,
      new AuditLiveStreamEvent(event.streamId, stream.organisationId, null, {
        streamId: event.streamId,
        streamName: stream.name,
        reason: 'source_disconnected',
        exitCode: event.exitCode,
      }),
    );
  }

  private async toInsertValues(
    organisationId: string,
    dto: CreateLiveStreamDto,
  ): Promise<NewLiveStream> {
    if (dto.sourceType !== LiveStreamSourceType.Ndi) {
      return {
        organisationId,
        name: dto.name,
        sourceType: LiveStreamSourceType.Pull,
        sourceUrl: dto.sourceUrl,
        protocol: dto.protocol,
        transcodingPreset: dto.transcodingPreset,
        audioEnabled: dto.audioEnabled,
      };
    }

    // The DTO cannot see the database: confirm the agent is this org's own.
    const agent = await this.siteAgentService.findOne(organisationId, dto.agentId!);
    return {
      organisationId,
      name: dto.name,
      sourceType: LiveStreamSourceType.Ndi,
      sourceUrl: null,
      agentId: agent.id,
      cameraHost: dto.cameraHost,
      ndiSourceName: dto.ndiSourceName?.trim() || null,
      qualityPreset: dto.qualityPreset,
      encoderPref: dto.encoderPref,
      transcodingPreset: dto.transcodingPreset,
      audioEnabled: dto.audioEnabled,
    };
  }

  /** Only the fields that belong to the stream's source type are ever written. */
  private async toUpdateValues(
    organisationId: string,
    stream: LiveStream,
    dto: UpdateLiveStreamDto,
  ): Promise<Partial<NewLiveStream>> {
    const common = this.definedOnly({
      name: dto.name,
      transcodingPreset: dto.transcodingPreset,
      audioEnabled: dto.audioEnabled,
    });

    if (stream.sourceType !== LiveStreamSourceType.Ndi) {
      return {
        ...common,
        ...this.definedOnly({ sourceUrl: dto.sourceUrl, protocol: dto.protocol }),
      };
    }

    if (dto.agentId) {
      await this.siteAgentService.findOne(organisationId, dto.agentId);
    }
    return {
      ...common,
      ...this.definedOnly({
        agentId: dto.agentId,
        cameraHost: dto.cameraHost,
        ndiSourceName:
          dto.ndiSourceName === undefined ? undefined : dto.ndiSourceName.trim() || null,
        qualityPreset: dto.qualityPreset,
        encoderPref: dto.encoderPref,
      }),
    };
  }

  private definedOnly<T extends object>(values: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private requireSourceUrl(stream: LiveStream): string {
    if (!stream.sourceUrl) {
      throw new BadRequestException('The live stream has no source URL.');
    }
    return stream.sourceUrl;
  }

  private assertAgentConnected(stream: LiveStream): void {
    if (!stream.agentId) {
      throw new BadRequestException('The NDI stream has no site agent assigned.');
    }
    if (!this.siteAgentSse.isConnected(stream.agentId)) {
      throw new ConflictException('Site agent offline');
    }
  }

  private async startPullIngest(stream: LiveStream): Promise<void> {
    // Checked against the resolved addresses, and deliberately outside the try
    // below: the DTO only sees the string, so a hostname that resolves into the
    // private ranges (or started doing so after it was saved) would otherwise be
    // dialled by FFmpeg — and a blocked target is a bad request, not a failing
    // encoder.
    await this.assertSourceReachable(this.requireSourceUrl(stream));

    // Start FFmpeg (idempotent — reuses if already running)
    try {
      await this.ffmpegLiveService.start(stream);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new BadGatewayException(`Failed to start FFmpeg transcoding: ${message}`);
    }
  }

  /**
   * Stops whatever produces the stream's HLS. Pull: the local FFmpeg. NDI: the
   * encoder lives on the agent, which is told to re-read its config (the stream
   * is no longer active there), and the uploaded files are removed here. Call
   * after the status change is persisted.
   */
  private async stopIngest(stream: LiveStream): Promise<void> {
    if (stream.sourceType === LiveStreamSourceType.Ndi) {
      this.ndiStatus.clear(stream.id, stream.agentId);
      await this.ndiHls.removeStreamDir(stream.id);
      this.pushReloadConfig(stream.agentId);
      return;
    }
    await this.ffmpegLiveService.stop(stream.id);
  }

  /**
   * Tells the agent to re-read its config. Not an error when it is offline: it
   * reconciles on reconnect and on its periodic refresh.
   */
  private pushReloadConfig(agentId: string | null): void {
    if (!agentId) {
      return;
    }
    const pushed = this.siteAgentSse.push(agentId, {
      commandId: randomUUID(),
      type: SiteAgentCommandType.ReloadConfig,
    });
    if (!pushed) {
      this.logger.warn(`Site agent ${agentId} is not connected; it will pick up the change later`);
    }
  }

  /**
   * Refuses a source whose resolved addresses are internal. Runs immediately
   * before FFmpeg is spawned rather than only at save time: DNS can point
   * somewhere else by now, and a stream saved before the validation existed has
   * never been checked at all.
   */
  private async assertSourceReachable(sourceUrl: string): Promise<void> {
    try {
      await this.outbound.assertUrl(sourceUrl, { schemes: LIVE_STREAM_SCHEMES });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Refused to start stream for ${sourceUrl}: ${reason}`);
      throw new BadRequestException('The stream source is not an allowed target.');
    }
  }
}
