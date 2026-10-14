import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { ContentSourceController } from './content-source.controller';
import type { ContentSourceService } from './content-source.service';

describe('ContentSourceController', () => {
  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const id = '660e8400-e29b-41d4-a716-446655440000';
  const userId = '880e8400-e29b-41d4-a716-446655440000';
  const req = { user: { userId, email: 'a@b.c' } } as AuthenticatedRequest;

  let service: Record<string, jest.Mock>;
  let controller: ContentSourceController;

  beforeEach(() => {
    service = {
      adapters: jest.fn().mockReturnValue([]),
      facets: jest.fn().mockResolvedValue({ venues: [], genres: [] }),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id }),
      create: jest.fn().mockResolvedValue({ id }),
      update: jest.fn().mockResolvedValue({ id }),
      remove: jest.fn().mockResolvedValue(undefined),
      requestSync: jest.fn().mockResolvedValue({ queued: true }),
      listEvents: jest.fn().mockResolvedValue([]),
    };
    controller = new ContentSourceController(service as unknown as ContentSourceService);
  });

  describe('access declarations', () => {
    const reflector = new Reflector();
    const rolesOf = (method: keyof ContentSourceController): unknown =>
      reflector.get(ROLES_KEY, ContentSourceController.prototype[method]);

    // RolesGuard default-denies an undeclared route; only a test catches a missing decorator.
    it.each(['adapters', 'facets', 'findAll', 'findOne', 'events'] as const)(
      'lets every member read via %s',
      (method) => {
        expect(rolesOf(method)).toEqual([
          OrganisationRole.OrgAdmin,
          OrganisationRole.Editor,
          OrganisationRole.Viewer,
        ]);
      },
    );

    it.each(['create', 'update', 'remove', 'sync'] as const)(
      'limits %s to admins and editors',
      (method) => {
        expect(rolesOf(method)).toEqual([OrganisationRole.OrgAdmin, OrganisationRole.Editor]);
      },
    );
  });

  it('delegates every route with the current organisation', async () => {
    const create = {
      name: 'C',
      adapterType: 'concertbuero-franken',
      formats: ['1920x1080' as const],
    };

    controller.adapters();
    await controller.facets(orgId, { sourceIds: [id] });
    await controller.findAll(orgId);
    await controller.findOne(orgId, id);
    await controller.create(orgId, create, req);
    await controller.update(orgId, id, { name: 'D' }, req);
    await controller.remove(orgId, id, req);
    await controller.sync(orgId, id, req);
    await controller.events(orgId, id, { venues: ['Hirsch'] });

    expect(service.adapters).toHaveBeenCalled();
    expect(service.facets).toHaveBeenCalledWith(orgId, { sourceIds: [id] });
    expect(service.findAll).toHaveBeenCalledWith(orgId);
    expect(service.findOne).toHaveBeenCalledWith(orgId, id);
    expect(service.create).toHaveBeenCalledWith(orgId, create, userId);
    expect(service.update).toHaveBeenCalledWith(orgId, id, { name: 'D' }, userId);
    expect(service.remove).toHaveBeenCalledWith(orgId, id, userId);
    expect(service.requestSync).toHaveBeenCalledWith(orgId, id, userId);
    expect(service.listEvents).toHaveBeenCalledWith(orgId, id, { venues: ['Hirsch'] });
  });
});
