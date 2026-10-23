import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { EventScheduleController } from './event-schedule.controller';
import type { EventScheduleRuleService } from './event-schedule-rule.service';
import type { CreateEventScheduleRuleDto } from './dto';

describe('EventScheduleController', () => {
  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const sourceId = '660e8400-e29b-41d4-a716-446655440000';
  const id = '770e8400-e29b-41d4-a716-446655440000';
  const eventId = '990e8400-e29b-41d4-a716-446655440000';
  const userId = '880e8400-e29b-41d4-a716-446655440000';
  const req = { user: { userId, email: 'a@b.c' } } as AuthenticatedRequest;

  let service: Record<string, jest.Mock>;
  let controller: EventScheduleController;

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id }),
      create: jest.fn().mockResolvedValue({ id }),
      update: jest.fn().mockResolvedValue({ id }),
      remove: jest.fn().mockResolvedValue(undefined),
      preview: jest.fn().mockResolvedValue([]),
      setExcluded: jest.fn().mockResolvedValue(undefined),
    };
    controller = new EventScheduleController(service as unknown as EventScheduleRuleService);
  });

  describe('access declarations', () => {
    const reflector = new Reflector();
    const rolesOf = (method: keyof EventScheduleController): unknown =>
      reflector.get(ROLES_KEY, EventScheduleController.prototype[method]);

    // RolesGuard default-denies an undeclared route; only a test catches a missing decorator.
    it.each(['findAll', 'findOne', 'preview'] as const)(
      'lets every member read via %s',
      (method) => {
        expect(rolesOf(method)).toEqual([
          OrganisationRole.OrgAdmin,
          OrganisationRole.Editor,
          OrganisationRole.Viewer,
        ]);
      },
    );

    it.each(['create', 'update', 'remove', 'exclude', 'include'] as const)(
      'lets only admins and editors write via %s',
      (method) => {
        expect(rolesOf(method)).toEqual([OrganisationRole.OrgAdmin, OrganisationRole.Editor]);
      },
    );
  });

  it('delegates reads with the organisation and source', async () => {
    await controller.findAll(orgId, sourceId);
    await controller.findOne(orgId, sourceId, id);
    await controller.preview(orgId, sourceId, id);

    expect(service.findAll).toHaveBeenCalledWith(orgId, sourceId);
    expect(service.findOne).toHaveBeenCalledWith(orgId, sourceId, id);
    expect(service.preview).toHaveBeenCalledWith(orgId, sourceId, id);
  });

  it('delegates writes with the acting user', async () => {
    const dto = { name: 'Rule' } as CreateEventScheduleRuleDto;

    await controller.create(orgId, sourceId, dto, req);
    await controller.update(orgId, sourceId, id, { enabled: false }, req);
    await controller.remove(orgId, sourceId, id, req);

    expect(service.create).toHaveBeenCalledWith(orgId, sourceId, dto, userId);
    expect(service.update).toHaveBeenCalledWith(orgId, sourceId, id, { enabled: false }, userId);
    expect(service.remove).toHaveBeenCalledWith(orgId, sourceId, id, userId);
  });

  it('excludes and includes single events', async () => {
    await controller.exclude(orgId, sourceId, id, eventId, req);
    await controller.include(orgId, sourceId, id, eventId, req);

    expect(service.setExcluded).toHaveBeenNthCalledWith(
      1,
      orgId,
      sourceId,
      id,
      eventId,
      true,
      userId,
    );
    expect(service.setExcluded).toHaveBeenNthCalledWith(
      2,
      orgId,
      sourceId,
      id,
      eventId,
      false,
      userId,
    );
  });
});
