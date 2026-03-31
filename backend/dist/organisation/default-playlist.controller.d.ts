import { OrganisationService } from './organisation.service';
import { SetDefaultPlaylistDto } from './dto';
import { Organisation } from './organisation.entity';
export declare class DefaultPlaylistController {
    private readonly organisationService;
    constructor(organisationService: OrganisationService);
    setDefaultPlaylist(orgId: string, dto: SetDefaultPlaylistDto): Promise<Organisation>;
}
