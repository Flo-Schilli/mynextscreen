import { Repository } from 'typeorm';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { Screen } from '../screen/screen.entity';
import { SlicedRendition } from '../slice-content/sliced-rendition.entity';
import { ScreenStateService } from '../screen/screen-state.service';
import { GroupScheduleChangedEvent } from '../schedule/schedule.event';
import { ScreenStateChangeEvent } from '../screen/screen-state.event';
import { ScheduleService } from '../schedule/schedule.service';
export declare class ScreenProtocolService {
    private readonly screenGroupRepository;
    private readonly screenRepository;
    private readonly slicedRenditionRepository;
    private readonly screenStateService;
    private readonly scheduleService;
    private readonly logger;
    constructor(screenGroupRepository: Repository<ScreenGroup>, screenRepository: Repository<Screen>, slicedRenditionRepository: Repository<SlicedRendition>, screenStateService: ScreenStateService, scheduleService: ScheduleService);
    handleGroupScheduleChanged(event: GroupScheduleChangedEvent): Promise<void>;
    handleGroupLiveStreamStarted(event: ScreenStateChangeEvent): Promise<void>;
    triggerGroupPlay(groupId: string, organisationId: string, contentUrl: string, contentItemId: string, isLiveStream: boolean): Promise<void>;
    private fanOutMirror;
    private fanOutSplit;
    private fanOutSplitPlay;
}
