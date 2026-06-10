import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { OrganisationService } from './organisation.service';
import { OrganisationController } from './organisation.controller';
import { DefaultPlaylistController } from './default-playlist.controller';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [UserModule],
  controllers: [OrganisationController, DefaultPlaylistController, StorageController],
  providers: [OrganisationService, StorageService],
  exports: [OrganisationService, StorageService],
})
export class OrganisationModule {}
