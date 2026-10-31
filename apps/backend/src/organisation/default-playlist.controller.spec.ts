import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { DefaultPlaylistController } from './default-playlist.controller';
import { OrganisationService } from './organisation.service';
import type { Organisation } from '../db/schema';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';

const req = { user: { userId: 'user-1' } } as unknown as AuthenticatedRequest;

describe('DefaultPlaylistController', () => {
  let controller: DefaultPlaylistController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const playlistId = '660e8400-e29b-41d4-a716-446655440000';

  const mockOrganisation: Organisation = {
    id: orgId,
    name: 'Test Org',
    timeZone: 'Europe/Vienna',
    storageOriginalLimitBytes: 1073741824,
    storageTranscodedLimitBytes: 2147483648,
    storageOriginalUsedBytes: 0,
    storageTranscodedUsedBytes: 0,
    requireMfa: false,
    requireMfaSince: null,
    defaultPlaylistId: playlistId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      setDefaultPlaylist: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DefaultPlaylistController],
      providers: [{ provide: OrganisationService, useValue: service }],
    }).compile();

    controller = module.get<DefaultPlaylistController>(DefaultPlaylistController);
  });

  describe('access declarations', () => {
    const reflector = new Reflector();
    const rolesOf = (method: keyof DefaultPlaylistController): unknown =>
      reflector.get(ROLES_KEY, DefaultPlaylistController.prototype[method]);

    // RolesGuard default-denies an undeclared route; only a test catches a missing decorator.
    it('lets every member read the default playlist', () => {
      expect(rolesOf('getDefaultPlaylist')).toEqual([
        OrganisationRole.OrgAdmin,
        OrganisationRole.Editor,
        OrganisationRole.Viewer,
      ]);
    });

    it('lets only org admins change it', () => {
      expect(rolesOf('setDefaultPlaylist')).toEqual([OrganisationRole.OrgAdmin]);
    });
  });

  it('returns only the default playlist id of the organisation', async () => {
    service.findOne.mockResolvedValue(mockOrganisation);

    const result = await controller.getDefaultPlaylist(orgId);

    expect(service.findOne).toHaveBeenCalledWith(orgId);
    expect(result).toEqual({ playlistId });
  });

  it('returns null when the organisation has no default playlist', async () => {
    service.findOne.mockResolvedValue({ ...mockOrganisation, defaultPlaylistId: null });

    await expect(controller.getDefaultPlaylist(orgId)).resolves.toEqual({ playlistId: null });
  });

  it('should set the default playlist', async () => {
    service.setDefaultPlaylist.mockResolvedValue(mockOrganisation);

    const result = await controller.setDefaultPlaylist(orgId, { playlistId }, req);

    expect(service.setDefaultPlaylist).toHaveBeenCalledWith(orgId, playlistId, 'user-1');
    expect(result).toEqual(mockOrganisation);
  });

  it('should clear the default playlist when playlistId is null', async () => {
    const cleared = { ...mockOrganisation, defaultPlaylistId: null };
    service.setDefaultPlaylist.mockResolvedValue(cleared);

    const result = await controller.setDefaultPlaylist(orgId, { playlistId: null }, req);

    expect(service.setDefaultPlaylist).toHaveBeenCalledWith(orgId, null, 'user-1');
    expect(result.defaultPlaylistId).toBeNull();
  });
});
