import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleEntry } from './schedule-entry.entity';
import { Organisation } from '../organisation/organisation.entity';
import { Screen } from '../screen/screen.entity';
import { Playlist } from '../playlist/playlist.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { SliceContentModule } from '../slice-content';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleEntry, Organisation, Screen, Playlist, ScreenGroup]),
    SliceContentModule,
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [TypeOrmModule, ScheduleService],
})
export class ScheduleEntryModule {}
