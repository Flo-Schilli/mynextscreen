import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Content } from './content.entity';
import { ContentType } from './content-type.enum';
import { StorageService } from '../organisation/storage.service';
import { UploadContentDto } from './dto/upload-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
export declare class ContentService {
    private readonly contentRepository;
    private readonly transcodingQueue;
    private readonly configService;
    private readonly storageService;
    private readonly eventEmitter;
    private readonly mediaBasePath;
    private readonly maxFileSizeBytes;
    constructor(contentRepository: Repository<Content>, transcodingQueue: Queue, configService: ConfigService, storageService: StorageService, eventEmitter: EventEmitter2);
    upload(organisationId: string, file: Express.Multer.File, dto: UploadContentDto): Promise<Content>;
    findAll(organisationId: string, filters?: {
        type?: ContentType;
        tags?: string[];
    }): Promise<Content[]>;
    findOne(organisationId: string, id: string): Promise<Content>;
    updateMetadata(organisationId: string, id: string, dto: UpdateContentDto): Promise<Content>;
    delete(organisationId: string, id: string): Promise<void>;
    reUpload(organisationId: string, id: string, file: Express.Multer.File): Promise<Content>;
    private validateFile;
    private unlinkSafe;
}
