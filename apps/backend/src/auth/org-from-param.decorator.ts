import { SetMetadata } from '@nestjs/common';

export const ORG_PARAM_KEY = 'orgFromParam';

/**
 * Declares that the organisation context for the decorated controller (or
 * method) comes from a **route parameter** instead of the `X-Organisation-Id`
 * header / `organisationId` query param.
 *
 * This exists because the RolesGuard must check membership against the *same*
 * organisation the handler operates on. Without this declaration a route like
 * `organisations/:orgId/members` lets the two diverge: the guard validates the
 * header while the handler uses the path — a cross-tenant hole.
 *
 * The parameter name must be given explicitly: `:id` means an organisation on
 * `organisations/:id/notification-config` but a content/playlist id elsewhere,
 * so the guard cannot infer it.
 *
 * Usage:
 * ```ts
 * @Controller('organisations/:orgId/members')
 * @OrgFromParam('orgId')
 * @Roles(OrganisationRole.OrgAdmin)
 * export class MembershipController { ... }
 * ```
 */
export const OrgFromParam = (param: string) => SetMetadata(ORG_PARAM_KEY, param);
