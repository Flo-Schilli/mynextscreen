import { MembershipService } from './membership.service';
import { AddMemberDto, UpdateMemberRoleDto } from './dto';
import { UserOrganisationMembership } from './user-organisation-membership.entity';
export declare class MembershipController {
    private readonly membershipService;
    constructor(membershipService: MembershipService);
    listMembers(orgId: string): Promise<UserOrganisationMembership[]>;
    addMember(orgId: string, dto: AddMemberDto): Promise<UserOrganisationMembership>;
    updateRole(orgId: string, userId: string, dto: UpdateMemberRoleDto): Promise<UserOrganisationMembership>;
    removeMember(orgId: string, userId: string): Promise<void>;
}
