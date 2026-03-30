import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { UserNotificationPreference } from './user-notification-preference.entity';

describe('UserNotificationPreferenceService', () => {
  let service: UserNotificationPreferenceService;
  let repo: Record<string, jest.Mock>;

  const userId = 'user-1';
  const orgId = 'org-1';

  const defaultPref: UserNotificationPreference = {
    id: 'pref-1',
    userId,
    organisationId: orgId,
    inAppEnabled: true,
    emailEnabled: false,
    ntfyEnabled: false,
    user: {} as UserNotificationPreference['user'],
    organisation: {} as UserNotificationPreference['organisation'],
  };

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    service = new UserNotificationPreferenceService(
      repo as unknown as import('typeorm').Repository<UserNotificationPreference>,
    );
  });

  describe('getForUser', () => {
    it('should return existing preference', async () => {
      repo.findOne.mockResolvedValue(defaultPref);

      const result = await service.getForUser(userId, orgId);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { userId, organisationId: orgId },
      });
      expect(result).toEqual(defaultPref);
    });

    it('should create default preference if none exists', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(defaultPref);
      repo.save.mockResolvedValue(defaultPref);

      const result = await service.getForUser(userId, orgId);

      expect(repo.create).toHaveBeenCalledWith({
        userId,
        organisationId: orgId,
        inAppEnabled: true,
        emailEnabled: false,
        ntfyEnabled: false,
      });
      expect(repo.save).toHaveBeenCalledWith(defaultPref);
      expect(result).toEqual(defaultPref);
    });
  });

  describe('upsert', () => {
    it('should update existing preference', async () => {
      const existing = { ...defaultPref };
      repo.findOne.mockResolvedValue(existing);
      const updated = { ...existing, emailEnabled: true };
      repo.save.mockResolvedValue(updated);

      const result = await service.upsert(userId, orgId, {
        emailEnabled: true,
      });

      expect(existing.emailEnabled).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(result).toEqual(updated);
    });

    it('should only update provided fields', async () => {
      const existing = { ...defaultPref };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(existing);

      await service.upsert(userId, orgId, { ntfyEnabled: true });

      expect(existing.ntfyEnabled).toBe(true);
      expect(existing.inAppEnabled).toBe(true);
      expect(existing.emailEnabled).toBe(false);
    });

    it('should create new preference if none exists', async () => {
      repo.findOne.mockResolvedValue(null);
      const newPref = { ...defaultPref, emailEnabled: true };
      repo.create.mockReturnValue(newPref);
      repo.save.mockResolvedValue(newPref);

      const result = await service.upsert(userId, orgId, {
        emailEnabled: true,
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId,
        organisationId: orgId,
        inAppEnabled: true,
        emailEnabled: true,
        ntfyEnabled: false,
      });
      expect(result).toEqual(newPref);
    });
  });
});
