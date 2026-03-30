import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  TRANSCODING_COMPLETED,
  TRANSCODING_FAILED,
  TRANSCODING_PROGRESS,
  TranscodingCompletedEvent,
  TranscodingFailedEvent,
  TranscodingProgressEvent,
} from '../content/transcoding.event';
import {
  SCREEN_STATUS_CHANGED,
  ScreenStatusEvent,
} from '../screen/screen-status.event';
import {
  SCHEDULE_ENTRY_CHANGED,
  ScheduleEntryChangedEvent,
} from '../schedule/schedule.event';

export interface DashboardEventPayload {
  type: string;
  data: unknown;
  timestamp: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class DashboardGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DashboardGateway.name);
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private readonly hankoApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.hankoApiUrl = this.configService.get<string>('HANKO_API_URL', '');
  }

  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        (client.handshake.query['token'] as string);

      if (!token) {
        this.logger.warn('Connection rejected: no token provided');
        client.disconnect(true);
        return;
      }

      const jwks = this.getJwks();
      await jwtVerify(token, jwks, { issuer: this.hankoApiUrl });
    } catch {
      this.logger.warn('Connection rejected: invalid JWT');
      client.disconnect(true);
      return;
    }

    const orgId =
      (client.handshake.auth?.organisationId as string) ??
      (client.handshake.query['organisationId'] as string);

    if (orgId) {
      client.join(`org:${orgId}`);
    }
  }

  handleDisconnect(): void {
    // no-op
  }

  private getJwks(): ReturnType<typeof createRemoteJWKSet> {
    if (!this.jwks) {
      const jwksUrl = new URL('/.well-known/jwks.json', this.hankoApiUrl);
      this.jwks = createRemoteJWKSet(jwksUrl);
    }
    return this.jwks;
  }

  private emitToOrg(organisationId: string, type: string, data: unknown): void {
    const payload: DashboardEventPayload = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`org:${organisationId}`).emit(type, payload);
  }

  @OnEvent(SCREEN_STATUS_CHANGED)
  handleScreenStatusChanged(event: ScreenStatusEvent): void {
    const type = event.isOnline ? 'screen.online' : 'screen.offline';
    this.emitToOrg(event.organisationId, type, {
      screenId: event.screenId,
    });
  }

  @OnEvent(TRANSCODING_PROGRESS)
  handleTranscodingProgress(event: TranscodingProgressEvent): void {
    this.emitToOrg(event.organisationId, 'transcoding.progress', {
      contentId: event.contentId,
      progress: event.progress,
    });
  }

  @OnEvent(TRANSCODING_COMPLETED)
  handleTranscodingCompleted(event: TranscodingCompletedEvent): void {
    this.emitToOrg(event.organisationId, 'transcoding.complete', {
      contentId: event.contentId,
      transcodedSizeBytes: event.transcodedSizeBytes,
    });
  }

  @OnEvent(TRANSCODING_FAILED)
  handleTranscodingFailed(event: TranscodingFailedEvent): void {
    this.emitToOrg(event.organisationId, 'transcoding.failed', {
      contentId: event.contentId,
      error: event.error,
    });
  }

  @OnEvent(SCHEDULE_ENTRY_CHANGED)
  handleScheduleChanged(event: ScheduleEntryChangedEvent): void {
    this.emitToOrg(event.organisationId, 'schedule.updated', {
      screenId: event.screenId,
    });
  }
}
