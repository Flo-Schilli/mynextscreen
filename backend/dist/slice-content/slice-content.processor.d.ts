import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { SlicedRendition } from './sliced-rendition.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { Screen } from '../screen/screen.entity';
import { Playlist } from '../playlist/playlist.entity';
import { Content } from '../content/content.entity';
export interface SliceContentJobData {
    groupId: string;
    scheduleId: string;
    playlistId: string;
    organisationId: string;
}
export declare class SliceContentProcessor extends WorkerHost {
    private readonly renditionRepository;
    private readonly groupRepository;
    private readonly screenRepository;
    private readonly playlistRepository;
    private readonly contentRepository;
    private readonly configService;
    private readonly logger;
    private readonly mediaBasePath;
    private readonly ffmpegPath;
    constructor(renditionRepository: Repository<SlicedRendition>, groupRepository: Repository<ScreenGroup>, screenRepository: Repository<Screen>, playlistRepository: Repository<Playlist>, contentRepository: Repository<Content>, configService: ConfigService);
    process(job: Job<SliceContentJobData>): Promise<void>;
    private runFfmpegCrop;
    private runFfmpeg;
    private probeResolution;
    private computeFileHash;
}
