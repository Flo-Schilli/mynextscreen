import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { ScreenGroup } from './screen-group.entity';
import { CreateScreenGroupDto } from './dto/create-screen-group.dto';
import { UpdateScreenGroupDto } from './dto/update-screen-group.dto';
import { AssignScreenDto } from './dto/assign-screen.dto';
import { Screen } from '../screen/screen.entity';
export declare class ScreenGroupService extends OrganisationScopedService<ScreenGroup> {
    private readonly screenRepository;
    private readonly eventEmitter;
    constructor(repository: Repository<ScreenGroup>, screenRepository: Repository<Screen>, eventEmitter: EventEmitter2);
    findAll(organisationId: string): Promise<ScreenGroup[]>;
    findOne(organisationId: string, id: string): Promise<ScreenGroup>;
    createGroup(organisationId: string, dto: CreateScreenGroupDto, userId?: string | null): Promise<ScreenGroup>;
    updateGroup(organisationId: string, id: string, dto: UpdateScreenGroupDto, userId?: string | null): Promise<ScreenGroup>;
    removeGroup(organisationId: string, id: string, userId?: string | null): Promise<void>;
    assignScreen(organisationId: string, groupId: string, screenId: string, dto: AssignScreenDto, userId?: string | null): Promise<Screen>;
    removeScreen(organisationId: string, groupId: string, screenId: string, userId?: string | null): Promise<Screen>;
}
