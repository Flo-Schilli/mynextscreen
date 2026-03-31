import { ScreenGroupService } from './screen-group.service';
import { CreateScreenGroupDto, UpdateScreenGroupDto, AssignScreenDto } from './dto';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { ScreenGroup } from './screen-group.entity';
import { Screen } from '../screen/screen.entity';
export declare class ScreenGroupController {
    private readonly screenGroupService;
    constructor(screenGroupService: ScreenGroupService);
    create(organisationId: string, dto: CreateScreenGroupDto, req: AuthenticatedRequest): Promise<ScreenGroup>;
    findAll(organisationId: string): Promise<ScreenGroup[]>;
    findOne(organisationId: string, id: string): Promise<ScreenGroup>;
    update(organisationId: string, id: string, dto: UpdateScreenGroupDto, req: AuthenticatedRequest): Promise<ScreenGroup>;
    remove(organisationId: string, id: string, req: AuthenticatedRequest): Promise<void>;
    assignScreen(organisationId: string, groupId: string, screenId: string, dto: AssignScreenDto, req: AuthenticatedRequest): Promise<Screen>;
    removeScreen(organisationId: string, groupId: string, screenId: string, req: AuthenticatedRequest): Promise<Screen>;
}
