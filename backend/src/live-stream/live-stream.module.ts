import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveStream } from './live-stream.entity';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamController } from './live-stream.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LiveStream])],
  controllers: [LiveStreamController],
  providers: [LiveStreamService],
  exports: [LiveStreamService, TypeOrmModule],
})
export class LiveStreamModule {}
