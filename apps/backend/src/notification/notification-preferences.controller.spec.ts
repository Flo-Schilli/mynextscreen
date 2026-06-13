import { NotificationPreferencesController } from './notification-preferences.controller';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import type { UserNotificationPreference } from '../db/schema';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';

describe('NotificationPreferencesController', () => {
  let controller: NotificationPreferencesController;
  let prefService: Record<string, jest.Mock>;

  const userId = 'user-1';

  const mockPref: UserNotificationPreference = {
    id: 'pref-1',
    userId,
    inAppEnabled: true,
    emailEnabled: false,
    ntfyEnabled: false,
  };

  const mockReq = {
    user: { userId, email: 'test@example.com' },
  } as AuthenticatedRequest;

  beforeEach(() => {
    prefService = {
      getForUser: jest.fn(),
      upsert: jest.fn(),
    };

    controller = new NotificationPreferencesController(
      prefService as unknown as UserNotificationPreferenceService,
    );
  });

  describe('getPreferences', () => {
    it('should return the global preferences for the current user', async () => {
      prefService.getForUser.mockResolvedValue(mockPref);

      const result = await controller.getPreferences(mockReq);

      expect(prefService.getForUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockPref);
    });
  });

  describe('updatePreferences', () => {
    it('should update the global preferences for the current user', async () => {
      const updated = { ...mockPref, emailEnabled: true };
      prefService.upsert.mockResolvedValue(updated);

      const result = await controller.updatePreferences(mockReq, {
        emailEnabled: true,
      });

      expect(prefService.upsert).toHaveBeenCalledWith(userId, {
        emailEnabled: true,
      });
      expect(result).toEqual(updated);
    });
  });
});
