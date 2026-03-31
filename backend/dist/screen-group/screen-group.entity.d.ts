import { Organisation } from '../organisation/organisation.entity';
import { Screen } from '../screen/screen.entity';
import { ScreenGroupMode } from './screen-group-mode.enum';
export declare class ScreenGroup {
    id: string;
    organisationId: string;
    organisation: Organisation;
    name: string;
    mode: ScreenGroupMode;
    gridColumns: number | null;
    gridRows: number | null;
    screens: Screen[];
    createdAt: Date;
    updatedAt: Date;
}
