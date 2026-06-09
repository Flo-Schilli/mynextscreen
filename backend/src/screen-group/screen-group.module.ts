import { Module } from '@nestjs/common';
import { ScreenGroupService } from './screen-group.service';
import { ScreenGroupController } from './screen-group.controller';

@Module({
  controllers: [ScreenGroupController],
  providers: [ScreenGroupService],
  exports: [ScreenGroupService],
})
export class ScreenGroupModule {}
