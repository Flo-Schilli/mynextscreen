import { Module } from '@nestjs/common';
import { PlayerAppsController } from './player-apps.controller';
import { PlayerAppsService } from './player-apps.service';

@Module({
  controllers: [PlayerAppsController],
  providers: [PlayerAppsService],
  exports: [PlayerAppsService],
})
export class PlayerAppsModule {}
