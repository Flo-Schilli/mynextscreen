import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { ScreenService } from './screen.service';
export declare class ScreenScheduler {
    private readonly screenService;
    private readonly eventEmitter;
    private readonly configService;
    private readonly logger;
    private readonly offlineThresholdMs;
    constructor(screenService: ScreenService, eventEmitter: EventEmitter2, configService: ConfigService);
    detectOfflineScreens(): Promise<void>;
}
