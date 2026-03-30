import { OrgNotificationConfigController } from './org-notification-config.controller';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { OrganisationNotificationConfig } from './organisation-notification-config.entity';

describe('OrgNotificationConfigController', () => {
  let controller: OrgNotificationConfigController;
  let configService: Record<string, jest.Mock>;

  const orgId = 'org-1';

  const mockConfig: OrganisationNotificationConfig = {
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
    configService = {
      getForOrg: jest.fn(),
      upsert: jest.fn(),
    };

    controller = new OrgNotificationConfigController(
      configService as unknown as OrgNotificationConfigService,
    );
  });

  describe('getConfig', () => {
    it('should return config with redacted sensitive fields', async () => {
      configService.getForOrg.mockResolvedValue(mockConfig);

      const result = await controller.getConfig(orgId);

      expect(configService.getForOrg).toHaveBeenCalledWith(orgId);
      expect(result.smtpPassword).toBe('••••••••');
      expect(result.ntfyToken).toBe('••••••••');
      expect(result.smtpHost).toBe('smtp.example.com');
    });

    it('should return default empty config if none exists', async () => {
      configService.getForOrg.mockResolvedValue(null);

      const result = await controller.getConfig(orgId);

      expect(result.organisationId).toBe(orgId);
      expect(result.smtpHost).toBeNull();
      expect(result.ntfyUrl).toBeNull();
    });

    it('should not redact null passwords', async () => {
      const configNoPassword = {
        ...mockConfig,
        smtpPassword: null,
        ntfyToken: null,
      };
      configService.getForOrg.mockResolvedValue(configNoPassword);

      const result = await controller.getConfig(orgId);

      expect(result.smtpPassword).toBeNull();
      expect(result.ntfyToken).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('should update config and redact sensitive fields in response', async () => {
      configService.upsert.mockResolvedValue(mockConfig);

      const result = await controller.updateConfig(orgId, {
        smtpHost: 'new-host.example.com',
      });

      expect(configService.upsert).toHaveBeenCalledWith(orgId, {
        smtpHost: 'new-host.example.com',
      });
      expect(result.smtpPassword).toBe('••••••••');
      expect(result.ntfyToken).toBe('••••••••');
    });
  });
});
