import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import { In, Repository } from 'typeorm';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { LiveStream } from './live-stream.entity';
import { LiveStreamActivation } from './live-stream-activation.entity';
import { LiveStreamStatus } from './live-stream-status.enum';
import { CreateLiveStreamDto } from './dto/create-live-stream.dto';
import { UpdateLiveStreamDto } from './dto/update-live-stream.dto';
import { ActivateLiveStreamDto } from './dto/activate-live-stream.dto';
import {
  FfmpegLiveService,
  LIVE_STREAM_PROCESS_EXITED,
  LiveStreamProcessExitedEvent,
} from './ffmpeg-live.service';
import { ScreenGroupService } from '../screen-group/screen-group.service';
import { Screen } from '../screen/screen.entity';
import {
  LIVE_STREAM_STARTED,
  LIVE_STREAM_STOPPED,
  ScreenStateChangeEvent,
} from '../screen/screen-state.event';
import {
  AUDIT_LIVE_STREAM_ACTIVATED,
  AUDIT_LIVE_STREAM_DEACTIVATED,
  AUDIT_LIVE_STREAM_FAILED,
  AuditLiveStreamEvent,
} from '../audit-log/audit.events';

@Injectable()
export class LiveStreamService extends OrganisationScopedService<LiveStream> {
  private readonly logger = new Logger(LiveStreamService.name);

  constructor(
    @InjectRepository(LiveStream)
    repository: Repository<LiveStream>,
    @InjectRepository(LiveStreamActivation)
    private readonly activationRepository: Repository<LiveStreamActivation>,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
    private readonly ffmpegLiveService: FfmpegLiveService,
    private readonly screenGroupService: ScreenGroupService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(repository, 'LiveStream');
  }

  async createLiveStream(
    organisationId: string,
    dto: CreateLiveStreamDto,
  ): Promise<LiveStream> {
    return this.create(organisationId, dto);
  }

  async updateLiveStream(
    organisationId: string,
    id: string,
    dto: UpdateLiveStreamDto,
  ): Promise<LiveStream> {
    const stream = await this.findOne(organisationId, id);

    if (stream.status === LiveStreamStatus.Active) {
      throw new ConflictException(
        'Cannot update a live stream that is currently active. Deactivate the stream first.',
      );
    }

    Object.assign(stream, dto);
    return this.repository.save(stream);
  }

  async removeLiveStream(organisationId: string, id: string): Promise<void> {
    const stream = await this.findOne(organisationId, id);

    if (stream.status === LiveStreamStatus.Active) {
      throw new ConflictException(
        'Cannot delete a live stream that is currently active. Deactivate the stream first.',
      );
    }

    await this.repository.remove(stream);
  }

  async activateStream(
    organisationId: string,
    id: string,
    dto: ActivateLiveStreamDto,
    userId: string | null = null,
  ): Promise<LiveStream> {
    // Validate exactly one target is provided
    const hasScreenIds = dto.targetScreenIds && dto.targetScreenIds.length > 0;
    const hasGroupId = !!dto.targetGroupId;

    if (!hasScreenIds && !hasGroupId) {
      throw new BadRequestException(
        'Either targetScreenIds or targetGroupId must be provided.',
      );
    }

    if (hasScreenIds && hasGroupId) {
      throw new BadRequestException(
        'Provide either targetScreenIds or targetGroupId, not both.',
      );
    }

    const stream = await this.findOne(organisationId, id);

    // Resolve target screen IDs
    let targetScreenIds: string[];

    if (hasGroupId) {
      const group = await this.screenGroupService.findOne(
        organisationId,
        dto.targetGroupId!,
      );
      targetScreenIds = group.screens.map((s) => s.id);

      if (targetScreenIds.length === 0) {
        throw new BadRequestException(
          'The target screen group has no member screens.',
        );
      }
    } else {
      targetScreenIds = dto.targetScreenIds!;
    }

    // Validate all target screens belong to the current org
    const screens = await this.screenRepository.find({
      where: { id: In(targetScreenIds), organisationId },
    });

    if (screens.length !== targetScreenIds.length) {
      const foundIds = new Set(screens.map((s) => s.id));
      const missing = targetScreenIds.filter((id) => !foundIds.has(id));
      throw new ForbiddenException(
        `The following screen IDs do not belong to this organisation or do not exist: ${missing.join(', ')}`,
      );
    }

    // Start FFmpeg (idempotent — reuses if already running)
    try {
      await this.ffmpegLiveService.start(stream);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new BadGatewayException(
        `Failed to start FFmpeg transcoding: ${message}`,
      );
    }

    // Handle duplicate overrides: deactivate any previous stream on these screens
    const existingActivations = await this.activationRepository.find({
      where: { screenId: In(targetScreenIds) },
    });

    if (existingActivations.length > 0) {
      // Group by streamId to check if we need to clean up other streams
      const otherStreamIds = new Set(
        existingActivations
          .filter((a) => a.streamId !== id)
          .map((a) => a.streamId),
      );

      // Remove existing activations for these screens
      await this.activationRepository.remove(existingActivations);

      // For each other stream that lost all its screens, set status back to idle and stop FFmpeg
      for (const otherStreamId of otherStreamIds) {
        const remainingCount = await this.activationRepository.count({
          where: { streamId: otherStreamId },
        });

        if (remainingCount === 0) {
          await this.repository.update(otherStreamId, {
            status: LiveStreamStatus.Idle,
          });
          await this.ffmpegLiveService.stop(otherStreamId);
        }
      }
    }

    // Create activation records
    const activations = targetScreenIds.map((screenId) => {
      const activation = new LiveStreamActivation();
      activation.streamId = id;
      activation.screenId = screenId;
      return activation;
    });
    await this.activationRepository.save(activations);

    // Update stream status
    stream.status = LiveStreamStatus.Active;
    const saved = await this.repository.save(stream);

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
        targetScreenIds,
      }),
    );

    return saved;
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
    const activations = await this.activationRepository.find({
      where: { streamId: id },
    });
    const targetScreenIds = activations.map((a) => a.screenId);

    // Clear activation records
    if (activations.length > 0) {
      await this.activationRepository.remove(activations);
    }

    // Set status back to idle
    stream.status = LiveStreamStatus.Idle;
    const saved = await this.repository.save(stream);

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
  async handleUnplannedExit(
    event: LiveStreamProcessExitedEvent,
  ): Promise<void> {
    this.logger.warn(
      `Handling unplanned exit for stream ${event.streamId} (exit code: ${event.exitCode})`,
    );

    // Find the stream — it may have been deleted between the exit and this handler
    const stream = await this.repository.findOne({
      where: { id: event.streamId },
    });

    if (!stream) {
      return;
    }

    // Resolve active target screens
    const activations = await this.activationRepository.find({
      where: { streamId: event.streamId },
    });
    const targetScreenIds = activations.map((a) => a.screenId);

    // Clear activation records
    if (activations.length > 0) {
      await this.activationRepository.remove(activations);
    }

    // Set status to error
    stream.status = LiveStreamStatus.Error;
    await this.repository.save(stream);

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
}
