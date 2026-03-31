import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserOrganisationMembership } from './user-organisation-membership.entity';
export declare class UserService {
    private readonly userRepository;
    private readonly membershipRepository;
    constructor(userRepository: Repository<User>, membershipRepository: Repository<UserOrganisationMembership>);
    findOrCreate(userId: string, email: string): Promise<User>;
    getMemberships(userId: string): Promise<UserOrganisationMembership[]>;
    getMembership(userId: string, organisationId: string): Promise<UserOrganisationMembership | null>;
}
