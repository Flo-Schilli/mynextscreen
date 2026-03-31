import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Screen } from '../screen/screen.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [TypeOrmModule.forFeature([Screen])],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
