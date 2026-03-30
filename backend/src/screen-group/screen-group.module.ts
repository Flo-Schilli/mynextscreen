import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScreenGroup } from './screen-group.entity';
import { Screen } from '../screen/screen.entity';
import { ScreenGroupService } from './screen-group.service';
import { ScreenGroupController } from './screen-group.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ScreenGroup, Screen])],
  controllers: [ScreenGroupController],
  providers: [ScreenGroupService],
  exports: [ScreenGroupService, TypeOrmModule],
})
export class ScreenGroupModule {}
