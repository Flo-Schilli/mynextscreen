import { User } from './user.entity';
import { Organisation } from '../organisation/organisation.entity';
import { OrganisationRole } from './organisation-role.enum';
export declare class UserOrganisationMembership {
    id: string;
    userId: string;
    organisationId: string;
    role: OrganisationRole;
    user: User;
    organisation: Organisation;
    createdAt: Date;
}
