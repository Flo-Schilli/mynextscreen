import { ConfigService } from '@nestjs/config';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TranscodingCompletedEvent, TranscodingFailedEvent, TranscodingProgressEvent } from '../content/transcoding.event';
import { ScreenStatusEvent } from '../screen/screen-status.event';
import { ScheduleEntryChangedEvent } from '../schedule/schedule.event';
export interface DashboardEventPayload {
    type: string;
    data: unknown;
    timestamp: string;
}
export declare class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly configService;
    private readonly logger;
    private jwks;
    private readonly hankoApiUrl;
    constructor(configService: ConfigService);
    server: Server;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(): void;
    private getJwks;
    private emitToOrg;
    handleScreenStatusChanged(event: ScreenStatusEvent): void;
    handleTranscodingProgress(event: TranscodingProgressEvent): void;
    handleTranscodingCompleted(event: TranscodingCompletedEvent): void;
    handleTranscodingFailed(event: TranscodingFailedEvent): void;
    handleScheduleChanged(event: ScheduleEntryChangedEvent): void;
}
