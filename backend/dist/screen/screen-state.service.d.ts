import { OnModuleDestroy } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ScreenService } from './screen.service';
import { ScreenProtocolAdapter, ScreenState, ScreenEvent } from '../screen-protocol';
import { ScreenStateChangeEvent } from './screen-state.event';
import { ScheduleEntryChangedEvent, ScheduleService } from '../schedule';
interface MessageEvent {
    data: unknown;
    type?: string;
    id?: string;
    retry?: number;
}
export declare class ScreenStateService implements OnModuleDestroy {
    private readonly screenService;
    private readonly protocolAdapter;
    private readonly scheduleService;
    private readonly logger;
    private readonly connections;
    constructor(screenService: ScreenService, protocolAdapter: ScreenProtocolAdapter, scheduleService: ScheduleService);
    onModuleDestroy(): void;
    assembleState(organisationId: string, screenId: string): Promise<ScreenState>;
    getRenderedState(organisationId: string, screenId: string): Promise<unknown>;
    subscribe(screenId: string): Observable<MessageEvent>;
    pushEvent(screenId: string, event: ScreenEvent): void;
    handleScheduleEntryChanged(event: ScheduleEntryChangedEvent): Promise<void>;
    handleScheduleChanged(event: ScreenStateChangeEvent): void;
    handlePlaylistChanged(event: ScreenStateChangeEvent): void;
    handleContentChanged(event: ScreenStateChangeEvent): void;
    handleLiveStreamStarted(event: ScreenStateChangeEvent): void;
    handleLiveStreamStopped(event: ScreenStateChangeEvent): void;
}
export {};
