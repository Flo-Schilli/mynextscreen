import { SetMetadata } from '@nestjs/common';
import { OrganisationRole } from '../user/organisation-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator that specifies which organisation roles are allowed to access
 * the decorated controller method. The RolesGuard checks the user's role
 * in the current organisation against this list.
 *
 * Usage:
 * ```ts
 * @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
 * @Get()
 * findAll() { ... }
 * ```
 *
 * You can also pass string values:
 * ```ts
 * @Roles('org_admin', 'editor')
 * ```
 */
export const Roles = (...roles: (OrganisationRole | string)[]) => SetMetadata(ROLES_KEY, roles);
