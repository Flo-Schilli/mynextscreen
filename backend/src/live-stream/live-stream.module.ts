import { Module } from '@nestjs/common';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamController } from './live-stream.controller';
import { FfmpegLiveService } from './ffmpeg-live.service';
import { StreamHealthService } from './stream-health.service';
import { ScreenGroupModule } from '../screen-group/screen-group.module';

@Module({
  imports: [ScreenGroupModule],
  controllers: [LiveStreamController],
  providers: [LiveStreamService, FfmpegLiveService, StreamHealthService],
  exports: [LiveStreamService, FfmpegLiveService, StreamHealthService],
})
export class LiveStreamModule {}
