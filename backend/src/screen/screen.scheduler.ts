import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { ScreenService } from './screen.service';
import { ScreenStatusEvent, SCREEN_STATUS_CHANGED } from './screen-status.event';
import { AUDIT_SCREEN_OFFLINE, AuditScreenEvent } from '../audit-log/audit.events';

@Injectable()
export class ScreenScheduler {
  private readonly logger = new Logger(ScreenScheduler.name);
  private readonly offlineThresholdMs: number;

  constructor(
    private readonly screenService: ScreenService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.offlineThresholdMs = this.configService.get<number>(
      'SCREEN_OFFLINE_THRESHOLD_MS',
      120_000,
    );
  }

  @Interval(60_000)
  async detectOfflineScreens(): Promise<void> {
    const offlineScreens = await this.screenService.detectOfflineScreens(this.offlineThresholdMs);

    for (const screen of offlineScreens) {
      this.eventEmitter.emit(
        SCREEN_STATUS_CHANGED,
        new ScreenStatusEvent(screen.id, screen.organisationId, false),
      );
      this.eventEmitter.emit(
        AUDIT_SCREEN_OFFLINE,
        new AuditScreenEvent(screen.id, screen.organisationId, null, null),
      );
    }

    if (offlineScreens.length > 0) {
      this.logger.log(`Marked ${offlineScreens.length} screen(s) as offline`);
    }
  }
}
