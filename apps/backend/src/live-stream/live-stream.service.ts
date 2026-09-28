import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  Inject,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { and, eq, inArray } from 'drizzle-orm';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { liveStreams, liveStreamActivations, screens, type LiveStream } from '../db/schema';
import { LiveStreamStatus } from './live-stream-status.enum';
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
  ) {
    super(db, liveStreams, 'LiveStream');
  }

  async createLiveStream(
    organisationId: string,
    dto: CreateLiveStreamDto,
    userId: string | null = null,
  ): Promise<LiveStream> {
    const stream = await this.create(organisationId, dto);

    this.eventEmitter.emit(
      AUDIT_LIVE_STREAM_CREATED,
      new AuditLiveStreamEvent(stream.id, organisationId, userId, {
        streamId: stream.id,
        streamName: stream.name,
        sourceUrl: stream.sourceUrl,
        protocol: stream.protocol,
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

    if (stream.status === LiveStreamStatus.Active) {
      throw new ConflictException(
        'Cannot update a live stream that is currently active. Deactivate the stream first.',
      );
    }

    const [saved] = await this.db
      .update(liveStreams)
      .set(dto)
      .where(and(eq(liveStreams.id, id), eq(liveStreams.organisationId, organisationId)))
      .returning();

    this.eventEmitter.emit(
      AUDIT_LIVE_STREAM_UPDATED,
      new AuditLiveStreamEvent(id, organisationId, userId, {
        streamId: id,
        streamName: saved.name,
        sourceUrl: saved.sourceUrl,
        protocol: saved.protocol,
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

    await this.db
      .delete(liveStreams)
      .where(and(eq(liveStreams.id, id), eq(liveStreams.organisationId, organisationId)));

    this.eventEmitter.emit(
      AUDIT_LIVE_STREAM_DELETED,
      new AuditLiveStreamEvent(streamId, organisationId, userId, {
        streamId,
        streamName,
        sourceUrl,
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
    if (stream.transcodingPreset === TranscodingPreset.Passthrough) {
      try {
        const probeResult = await this.ffmpegLiveService.probeSourceStream(
          stream.sourceUrl,
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

    // Checked against the resolved addresses, and deliberately outside the try
    // below: the DTO only sees the string, so a hostname that resolves into the
    // private ranges (or started doing so after it was saved) would otherwise be
    // dialled by FFmpeg — and a blocked target is a bad request, not a failing
    // encoder.
    await this.assertSourceReachable(stream.sourceUrl);

    // Start FFmpeg (idempotent — reuses if already running)
    try {
      await this.ffmpegLiveService.start(stream);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new BadGatewayException(`Failed to start FFmpeg transcoding: ${message}`);
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
          await this.db
            .update(liveStreams)
            .set({ status: LiveStreamStatus.Idle })
            .where(eq(liveStreams.id, otherStreamId));
          await this.ffmpegLiveService.stop(otherStreamId);
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

    // Stop FFmpeg process (safe even if not running)
    await this.ffmpegLiveService.stop(id);

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
