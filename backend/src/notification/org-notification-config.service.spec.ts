import { OrgNotificationConfigService } from './org-notification-config.service';
import { OrganisationNotificationConfig } from './organisation-notification-config.entity';

describe('OrgNotificationConfigService', () => {
  let service: OrgNotificationConfigService;
  let repo: Record<string, jest.Mock>;

  const orgId = 'org-1';

  const existingConfig: OrganisationNotificationConfig = {
    id: 'config-1',
    organisationId: orgId,
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'user@example.com',
    smtpPassword: 'secret',
    smtpFrom: 'noreply@example.com',
    smtpSecure: false,
    ntfyUrl: 'https://ntfy.sh',
    ntfyTopic: 'my-topic',
    ntfyToken: 'token123',
    organisation: {} as OrganisationNotificationConfig['organisation'],
  };

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    service = new OrgNotificationConfigService(
      repo as unknown as import('typeorm').Repository<OrganisationNotificationConfig>,
    );
  });

  describe('getForOrg', () => {
    it('should return config if exists', async () => {
      repo.findOne.mockResolvedValue(existingConfig);

      const result = await service.getForOrg(orgId);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { organisationId: orgId },
      });
      expect(result).toEqual(existingConfig);
    });

    it('should return null if no config exists', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.getForOrg(orgId);

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should update existing config fields', async () => {
      const existing = { ...existingConfig };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(existing);

      await service.upsert(orgId, { smtpHost: 'new-host.example.com' });

      expect(existing.smtpHost).toBe('new-host.example.com');
      expect(repo.save).toHaveBeenCalledWith(existing);
    });

    it('should preserve existing password when blank password is provided', async () => {
      const existing = { ...existingConfig };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(existing);

      await service.upsert(orgId, { smtpPassword: '' });

      expect(existing.smtpPassword).toBe('secret');
    });

    it('should update password when non-blank value is provided', async () => {
      const existing = { ...existingConfig };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(existing);

      await service.upsert(orgId, { smtpPassword: 'new-secret' });

      expect(existing.smtpPassword).toBe('new-secret');
    });

    it('should preserve existing ntfy token when blank token is provided', async () => {
      const existing = { ...existingConfig };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(existing);

      await service.upsert(orgId, { ntfyToken: '' });

      expect(existing.ntfyToken).toBe('token123');
    });

    it('should create new config if none exists', async () => {
      repo.findOne.mockResolvedValue(null);
      const newConfig = { ...existingConfig };
      repo.create.mockReturnValue(newConfig);
      repo.save.mockResolvedValue(newConfig);

      const result = await service.upsert(orgId, {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
      });

      expect(repo.create).toHaveBeenCalledWith({
        organisationId: orgId,
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: null,
        smtpPassword: null,
        smtpFrom: null,
        smtpSecure: false,
        ntfyUrl: null,
        ntfyTopic: null,
        ntfyToken: null,
      });
      expect(result).toEqual(newConfig);
    });
  });
});
