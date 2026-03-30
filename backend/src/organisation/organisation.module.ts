import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organisation } from './organisation.entity';
import { Playlist } from '../playlist/playlist.entity';
import { OrganisationService } from './organisation.service';
import { OrganisationController } from './organisation.controller';
import { DefaultPlaylistController } from './default-playlist.controller';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organisation, Playlist])],
  controllers: [
    OrganisationController,
    DefaultPlaylistController,
    StorageController,
  ],
  providers: [OrganisationService, StorageService],
  exports: [OrganisationService, StorageService, TypeOrmModule],
})
export class OrganisationModule {}
