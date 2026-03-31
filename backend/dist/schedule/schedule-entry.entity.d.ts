import { Organisation } from '../organisation/organisation.entity';
import { Screen } from '../screen/screen.entity';
import { Playlist } from '../playlist/playlist.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';
export declare class ScheduleEntry {
    id: string;
    organisationId: string;
    organisation: Organisation;
    screenId: string | null;
    screen: Screen | null;
    groupId: string | null;
    group: ScreenGroup | null;
    playlistId: string;
    playlist: Playlist;
    startTime: Date;
    endTime: Date;
    rrule: string | null;
    colour: string;
    createdAt: Date;
    updatedAt: Date;
    get targetType(): 'screen' | 'group';
    get targetId(): string | null;
}
