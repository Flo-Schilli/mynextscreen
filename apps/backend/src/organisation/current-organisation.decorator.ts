import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * Parameter decorator that extracts the current organisation ID from the request.
 *
 * Reads from the `X-Organisation-Id` header or `organisationId` query parameter.
 * The RolesGuard (when applied) verifies the user's membership in this organisation.
 *
 * Usage:
 * ```ts
 * @Get()
 * findAll(@CurrentOrganisation() organisationId: string) {
 *   return this.service.findAllScoped(organisationId);
 * }
 * ```
 *
 * @throws BadRequestException if neither header nor query param is provided
 */
export const CurrentOrganisation = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const organisationId =
      (request.headers?.['x-organisation-id'] as string | undefined) ||
      (request.query?.organisationId as string | undefined);

    if (!organisationId) {
      throw new BadRequestException(
        'Missing organisation context. Provide X-Organisation-Id header or organisationId query parameter.',
      );
    }

    return organisationId;
  },
);
