import { Module } from '@nestjs/common';
import { ScheduleEntryModule } from '../schedule/schedule.module';
import { EventScheduleController } from './event-schedule.controller';
import { EventScheduleListener } from './event-schedule.listener';
import { EventScheduleReconcileService } from './event-schedule-reconcile.service';
import { EventScheduleRuleService } from './event-schedule-rule.service';

/**
 * Schedules playlists on the event days of content sources. Depends on the
 * schedule module; content sources reach it only through their events, so
 * neither module imports this one.
 */
@Module({
  imports: [ScheduleEntryModule],
  controllers: [EventScheduleController],
  providers: [EventScheduleRuleService, EventScheduleReconcileService, EventScheduleListener],
})
export class EventScheduleModule {}
