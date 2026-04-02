import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Screen } from '../screen/screen.entity';
import { SlicedRendition } from '../slice-content/sliced-rendition.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [TypeOrmModule.forFeature([Screen, SlicedRendition])],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
