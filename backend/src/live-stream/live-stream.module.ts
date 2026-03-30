import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveStream } from './live-stream.entity';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamController } from './live-stream.controller';
import { FfmpegLiveService } from './ffmpeg-live.service';

@Module({
  imports: [TypeOrmModule.forFeature([LiveStream])],
  controllers: [LiveStreamController],
  providers: [LiveStreamService, FfmpegLiveService],
  exports: [LiveStreamService, FfmpegLiveService, TypeOrmModule],
})
export class LiveStreamModule {}
