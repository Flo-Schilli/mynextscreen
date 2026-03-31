import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ContentService } from './content.service';
import { UploadContentDto } from './dto/upload-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { Content } from './content.entity';
import { ContentType } from './content-type.enum';
export declare class ContentController {
    private readonly contentService;
    private readonly configService;
    private readonly mediaBasePath;
    constructor(contentService: ContentService, configService: ConfigService);
    upload(organisationId: string, file: Express.Multer.File, dto: UploadContentDto): Promise<Content>;
    findAll(organisationId: string, type?: ContentType, tags?: string): Promise<Content[]>;
    findOne(organisationId: string, id: string): Promise<Content>;
    updateMetadata(organisationId: string, id: string, dto: UpdateContentDto): Promise<Content>;
    delete(organisationId: string, id: string): Promise<void>;
    reUpload(organisationId: string, id: string, file: Express.Multer.File): Promise<Content>;
    serveOriginal(organisationId: string, id: string, res: Response): Promise<void>;
    serveTranscoded(organisationId: string, id: string, res: Response): Promise<void>;
}
