import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveStream } from './live-stream.entity';
import { LiveStreamService } from './live-stream.service';

@Module({
  imports: [TypeOrmModule.forFeature([LiveStream])],
  providers: [LiveStreamService],
  exports: [LiveStreamService, TypeOrmModule],
})
export class LiveStreamModule {}
