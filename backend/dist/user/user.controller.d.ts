import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { UserOrganisationMembership } from './user-organisation-membership.entity';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getMemberships(req: AuthenticatedRequest): Promise<UserOrganisationMembership[]>;
}
