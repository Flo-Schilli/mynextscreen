import { UserOrganisationMembership } from './user-organisation-membership.entity';
export declare class User {
    id: string;
    email: string;
    name: string | null;
    memberships: UserOrganisationMembership[];
    createdAt: Date;
    updatedAt: Date;
}
