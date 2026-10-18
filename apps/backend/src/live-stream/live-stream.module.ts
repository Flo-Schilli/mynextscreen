import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamController } from './live-stream.controller';
import { NdiHlsUploadController } from './ndi-hls-upload.controller';
import { FfmpegLiveService } from './ffmpeg-live.service';
import { NdiHlsStorageService } from './ndi-hls-storage.service';
import { StreamHealthService } from './stream-health.service';
import { ScreenGroupModule } from '../screen-group/screen-group.module';
import { SiteAgentModule } from '../site-agent/site-agent.module';

@Module({
  imports: [CommonModule, ScreenGroupModule, SiteAgentModule],
  controllers: [LiveStreamController, NdiHlsUploadController],
  providers: [LiveStreamService, FfmpegLiveService, StreamHealthService, NdiHlsStorageService],
  exports: [LiveStreamService, FfmpegLiveService, StreamHealthService],
})
export class LiveStreamModule {}
