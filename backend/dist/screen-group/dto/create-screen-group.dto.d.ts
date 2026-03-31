import { ScreenGroupMode } from '../screen-group-mode.enum';
export declare class CreateScreenGroupDto {
    name: string;
    mode: ScreenGroupMode;
    gridColumns?: number;
    gridRows?: number;
}
