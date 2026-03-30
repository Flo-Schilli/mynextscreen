import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveStream } from './live-stream.entity';
import { LiveStreamActivation } from './live-stream-activation.entity';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamController } from './live-stream.controller';
import { FfmpegLiveService } from './ffmpeg-live.service';
import { Screen } from '../screen/screen.entity';
import { ScreenGroupModule } from '../screen-group/screen-group.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiveStream, LiveStreamActivation, Screen]),
    ScreenGroupModule,
  ],
  controllers: [LiveStreamController],
  providers: [LiveStreamService, FfmpegLiveService],
  exports: [LiveStreamService, FfmpegLiveService, TypeOrmModule],
})
export class LiveStreamModule {}
