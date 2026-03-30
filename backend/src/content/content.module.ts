import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Content } from './content.entity';
import { Organisation } from '../organisation/organisation.entity';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { TranscodingProcessor } from './transcoding.processor';
import { OrganisationModule } from '../organisation/organisation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, Organisation]),
    BullModule.registerQueue({
      name: 'transcoding',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    OrganisationModule,
  ],
  controllers: [ContentController],
  providers: [ContentService, TranscodingProcessor],
  exports: [TypeOrmModule, ContentService],
})
export class ContentModule {}
