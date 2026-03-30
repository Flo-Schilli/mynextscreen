import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Screen } from '../screen/screen.entity';
import { Content } from '../content/content.entity';
import { Playlist } from '../playlist/playlist.entity';
import { ScheduleEntry } from '../schedule/schedule-entry.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Screen, Content, Playlist, ScheduleEntry]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
