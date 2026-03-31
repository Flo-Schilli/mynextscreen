import { Organisation } from '../organisation/organisation.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { Screen } from '../screen/screen.entity';
import { Content } from '../content/content.entity';
export declare class SlicedRendition {
    id: string;
    organisationId: string;
    organisation: Organisation;
    groupId: string;
    group: ScreenGroup;
    screenId: string;
    screen: Screen;
    contentItemId: string;
    content: Content;
    filePath: string;
    sourceHash: string;
    createdAt: Date;
    updatedAt: Date;
}
