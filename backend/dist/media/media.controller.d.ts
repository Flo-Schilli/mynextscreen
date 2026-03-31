import { Response } from 'express';
import { ScreenAuthenticatedRequest } from '../auth';
import { MediaService } from './media.service';
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    serveMedia(req: ScreenAuthenticatedRequest, organisationId: string, contentId: string, res: Response): Promise<void>;
}
