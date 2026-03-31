import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { Content } from './content.entity';
import { ContentType } from './content-type.enum';
import { StorageService } from '../organisation/storage.service';
export interface TranscodeJobData {
    contentId: string;
    organisationId: string;
    originalPath: string;
    mimeType: string;
    type: ContentType;
}
export declare class TranscodingProcessor extends WorkerHost {
    private readonly contentRepository;
    private readonly configService;
    private readonly eventEmitter;
    private readonly storageService;
    private readonly logger;
    private readonly mediaBasePath;
    private readonly ffmpegPath;
    private readonly videoBitrate;
    constructor(contentRepository: Repository<Content>, configService: ConfigService, eventEmitter: EventEmitter2, storageService: StorageService);
    process(job: Job<TranscodeJobData>): Promise<void>;
    private transcodeVideo;
    private transcodeImage;
    private runFfmpeg;
    private updateStatus;
    private unlinkSafe;
}
