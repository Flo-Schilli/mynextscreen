import { ConfigService } from '@nestjs/config';
export interface MediaFileInfo {
    filePath: string;
    contentType: string;
}
export declare class MediaService {
    private readonly configService;
    private readonly mediaBasePath;
    constructor(configService: ConfigService);
    getTranscodedFile(organisationId: string, contentId: string): Promise<MediaFileInfo>;
    private findFile;
}
