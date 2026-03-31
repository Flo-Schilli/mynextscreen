import { Observable } from 'rxjs';
import { ScreenService } from './screen.service';
import { ScreenStateService } from './screen-state.service';
import { CreateScreenDto, UpdateScreenDto } from './dto';
import { ScreenAuthenticatedRequest } from '../auth';
import { Screen } from './screen.entity';
interface MessageEvent {
    data: unknown;
    type?: string;
    id?: string;
    retry?: number;
}
export declare class ScreenController {
    private readonly screenService;
    private readonly screenStateService;
    constructor(screenService: ScreenService, screenStateService: ScreenStateService);
    create(organisationId: string, dto: CreateScreenDto): Promise<{
        screen: Screen;
        apiKey: string;
    }>;
    findAll(organisationId: string): Promise<Screen[]>;
    findOne(organisationId: string, id: string): Promise<Screen>;
    update(organisationId: string, id: string, dto: UpdateScreenDto): Promise<Screen>;
    regenerateKey(organisationId: string, id: string): Promise<{
        screen: Screen;
        apiKey: string;
    }>;
    getState(req: ScreenAuthenticatedRequest, id: string): Promise<unknown>;
    events(req: ScreenAuthenticatedRequest, id: string): Observable<MessageEvent>;
    heartbeat(req: ScreenAuthenticatedRequest, id: string): Promise<Screen>;
}
export {};
