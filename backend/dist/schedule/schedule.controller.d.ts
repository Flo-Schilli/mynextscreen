import { ScheduleService } from './schedule.service';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { UpdateScheduleEntryDto } from './dto/update-schedule-entry.dto';
import { ScheduleEntry } from './schedule-entry.entity';
import { Playlist } from '../playlist/playlist.entity';
export declare class ScheduleController {
    private readonly scheduleService;
    constructor(scheduleService: ScheduleService);
    create(organisationId: string, dto: CreateScheduleEntryDto): Promise<ScheduleEntry>;
    find(organisationId: string, screenId?: string, from?: string, to?: string): Promise<Record<string, unknown>[]>;
    getCurrentPlaylist(screenId: string): Promise<{
        playlist: Playlist | null;
        isDefault: boolean;
    }>;
    update(organisationId: string, id: string, dto: UpdateScheduleEntryDto): Promise<ScheduleEntry>;
    delete(organisationId: string, id: string): Promise<void>;
}
