import { OrganisationService } from './organisation.service';
import { CreateOrganisationDto, UpdateOrganisationDto } from './dto';
import { Organisation } from './organisation.entity';
export declare class OrganisationController {
    private readonly organisationService;
    constructor(organisationService: OrganisationService);
    create(dto: CreateOrganisationDto): Promise<Organisation>;
    findAll(): Promise<Organisation[]>;
    findOne(id: string): Promise<Organisation>;
    update(id: string, dto: UpdateOrganisationDto): Promise<Organisation>;
}
