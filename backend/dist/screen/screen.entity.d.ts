import { Organisation } from '../organisation/organisation.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';
export declare class Screen {
    id: string;
    organisationId: string;
    organisation: Organisation;
    name: string;
    resolution: string;
    location: string;
    apiKeyHash: string;
    lastHeartbeat: Date | null;
    isOnline: boolean;
    groupId: string | null;
    group: ScreenGroup | null;
    gridRow: number | null;
    gridColumn: number | null;
    createdAt: Date;
    updatedAt: Date;
}
