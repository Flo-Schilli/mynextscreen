import { OrganisationRole } from '../user/organisation-role.enum';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: (OrganisationRole | string)[]) => import("@nestjs/common").CustomDecorator<string>;
