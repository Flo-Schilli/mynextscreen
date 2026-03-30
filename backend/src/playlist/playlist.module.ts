import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Playlist } from './playlist.entity';
import { PlaylistItem } from './playlist-item.entity';
import { Organisation } from '../organisation/organisation.entity';
import { Content } from '../content/content.entity';
import { PlaylistService } from './playlist.service';
import { PlaylistController } from './playlist.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Playlist, PlaylistItem, Organisation, Content]),
  ],
  controllers: [PlaylistController],
  providers: [PlaylistService],
  exports: [TypeOrmModule, PlaylistService],
})
export class PlaylistModule {}
