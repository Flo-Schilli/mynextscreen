import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserOrganisationMembership } from './user-organisation-membership.entity';
import { OrganisationRole } from './organisation-role.enum';
export declare class MembershipService {
    private readonly userRepository;
    private readonly membershipRepository;
    private readonly eventEmitter;
    constructor(userRepository: Repository<User>, membershipRepository: Repository<UserOrganisationMembership>, eventEmitter: EventEmitter2);
    listMembers(organisationId: string): Promise<UserOrganisationMembership[]>;
    addMember(organisationId: string, email: string, role: OrganisationRole): Promise<UserOrganisationMembership>;
    updateRole(organisationId: string, userId: string, role: OrganisationRole): Promise<UserOrganisationMembership>;
    removeMember(organisationId: string, userId: string): Promise<void>;
    private ensureNotLastAdmin;
}
