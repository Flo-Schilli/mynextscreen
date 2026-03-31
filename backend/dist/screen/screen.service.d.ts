import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { Screen } from './screen.entity';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
export declare class ScreenService extends OrganisationScopedService<Screen> {
    private readonly eventEmitter;
    constructor(repository: Repository<Screen>, eventEmitter: EventEmitter2);
    createScreen(organisationId: string, dto: CreateScreenDto): Promise<{
        screen: Screen;
        apiKey: string;
    }>;
    updateScreen(organisationId: string, id: string, dto: UpdateScreenDto): Promise<Screen>;
    regenerateApiKey(organisationId: string, id: string): Promise<{
        screen: Screen;
        apiKey: string;
    }>;
    recordHeartbeat(organisationId: string, id: string): Promise<Screen>;
    detectOfflineScreens(thresholdMs: number): Promise<Screen[]>;
}
