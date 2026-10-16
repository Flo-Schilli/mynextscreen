import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { CommonModule } from '../common/common.module';
import { ContentModule } from '../content/content.module';
import { ContentSourceController } from './content-source.controller';
import { ContentSourceService } from './content-source.service';
import { ContentSourceSyncService } from './content-source-sync.service';
import { ContentSourceSyncProcessor } from './content-source-sync.processor';
import { ContentSourceCleanupService } from './content-source-cleanup.service';
import { ContentSourceScheduler } from './content-source.scheduler';
import { ContentSourceAdapterRegistry } from './adapter.registry';
import { ConcertbueroFrankenAdapter } from './adapters/concertbuero-franken.adapter';
import {
  DEFAULT_SOURCE_HTTP_OPTIONS,
  SOURCE_HTTP_OPTIONS,
  SourceHttpClient,
} from './source-http.client';
import { SlideRendererService } from './slide/slide-renderer.service';
import { CONTENT_SOURCE_SYNC_QUEUE } from './content-source.constants';

@Module({
  imports: [
    // One attempt: a failed sync is recorded on the source and retried on its interval.
    BullModule.registerQueue({
      name: CONTENT_SOURCE_SYNC_QUEUE,
      defaultJobOptions: { attempts: 1 },
    }),
    HttpModule,
    CommonModule,
    ContentModule,
  ],
  controllers: [ContentSourceController],
  providers: [
    ContentSourceService,
    ContentSourceSyncService,
    ContentSourceSyncProcessor,
    ContentSourceCleanupService,
    ContentSourceScheduler,
    ContentSourceAdapterRegistry,
    ConcertbueroFrankenAdapter,
    SourceHttpClient,
    { provide: SOURCE_HTTP_OPTIONS, useValue: DEFAULT_SOURCE_HTTP_OPTIONS },
    SlideRendererService,
  ],
  exports: [ContentSourceService],
})
export class ContentSourceModule {}
