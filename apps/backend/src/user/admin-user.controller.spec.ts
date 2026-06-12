import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AdminUserController } from './admin-user.controller';
import type { UserService, UserWithMembershipsView } from './user.service';
import { removeOrganisationMedia } from '../content/content-storage.util';
import { OrganisationRole } from './organisation-role.enum';

jest.mock('../content/content-storage.util', () => ({
  removeOrganisationMedia: jest.fn().mockResolvedValue(undefined),
}));

const removeOrganisationMediaMock = removeOrganisationMedia as jest.MockedFunction<
  typeof removeOrganisationMedia
>;

describe('AdminUserController', () => {
  let controller: AdminUserController;
  let users: Record<string, jest.Mock>;

  beforeEach(() => {
    users = {
      listAllWithMemberships: jest.fn(),
      deleteUser: jest.fn(),
    };
    const config = { get: jest.fn(() => '/tmp/media') } as unknown as ConfigService;
    controller = new AdminUserController(users as unknown as UserService, config);
    removeOrganisationMediaMock.mockClear();
    removeOrganisationMediaMock.mockResolvedValue(undefined);
  });

  describe('listAll', () => {
    it('returns the user overview including emailVerified + memberships', async () => {
      const view: UserWithMembershipsView[] = [
        {
          id: 'u1',
          email: 'a@example.com',
          name: 'A',
          emailVerified: false,
          isSuperAdmin: false,
          createdAt: new Date(),
          memberships: [
            { organisationId: 'org-1', organisationName: 'Org One', role: OrganisationRole.Viewer },
          ],
        },
      ];
      users.listAllWithMemberships.mockResolvedValue(view);

      const result = await controller.listAll();

      expect(result).toBe(view);
      expect(result[0].emailVerified).toBe(false);
      expect(result[0].memberships[0].organisationName).toBe('Org One');
    });
  });

  describe('remove', () => {
    it('refuses to delete the last super-admin (403)', async () => {
      // The lockout guard is atomic inside deleteUser (row lock + re-count); the
      // controller delegates with guardLastSuperAdmin and surfaces its 403.
      users.deleteUser.mockRejectedValue(
        new ForbiddenException('Cannot delete the last super-admin'),
      );

      await expect(controller.remove('sa')).rejects.toThrow(ForbiddenException);
      expect(users.deleteUser).toHaveBeenCalledWith('sa', { guardLastSuperAdmin: true });
      expect(removeOrganisationMediaMock).not.toHaveBeenCalled();
    });

    it('deletes a user and wipes orphaned-org media', async () => {
      users.deleteUser.mockResolvedValue(['org-1']);

      await controller.remove('u1');

      expect(users.deleteUser).toHaveBeenCalledWith('u1', { guardLastSuperAdmin: true });
      expect(removeOrganisationMediaMock).toHaveBeenCalledWith('/tmp/media', 'org-1');
    });

    it('allows deleting a super-admin when others remain', async () => {
      users.deleteUser.mockResolvedValue([]);

      await controller.remove('sa');

      expect(users.deleteUser).toHaveBeenCalledWith('sa', { guardLastSuperAdmin: true });
    });
  });
});
