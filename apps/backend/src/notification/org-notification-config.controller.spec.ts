import { UnprocessableEntityException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { OrgNotificationConfigController } from './org-notification-config.controller';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { OutboundGuard } from '../common/outbound-guard.service';
import type { OrganisationNotificationConfig } from '../db/schema';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';

// Mock SmtpEmailProvider
const mockSendMail = jest.fn();
jest.mock('./channels/smtp-email-provider', () => ({
  SmtpEmailProvider: jest.fn().mockImplementation(() => ({
    sendMail: mockSendMail,
  })),
}));

describe('OrgNotificationConfigController', () => {
  let controller: OrgNotificationConfigController;
  let configService: Record<string, jest.Mock>;
  let httpService: Record<string, jest.Mock>;

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
    alertRules: {
      offline: true,
      recovered: true,
      transcodeFail: true,
      storage: false,
      weekly: false,
    },
  };

  const mockReq = {
    user: { userId: 'user-1', email: 'admin@example.com' },
  } as unknown as AuthenticatedRequest;

  let outbound: { assertUrl: jest.Mock; assertHost: jest.Mock };

  beforeEach(() => {
    configService = {
      getForOrg: jest.fn(),
      upsert: jest.fn(),
    };

    httpService = {
      post: jest.fn(),
    };

    mockSendMail.mockReset();

    outbound = {
      assertUrl: jest.fn().mockResolvedValue(new URL('https://ntfy.example.com')),
      assertHost: jest.fn().mockResolvedValue(undefined),
    };

    controller = new OrgNotificationConfigController(
      configService as unknown as OrgNotificationConfigService,
      httpService as unknown as HttpService,
      outbound as unknown as OutboundGuard,
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
      expect(result.alertRules).toEqual({
        offline: true,
        recovered: true,
        transcodeFail: true,
        storage: false,
        weekly: false,
      });
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

  describe('testEmail', () => {
    it('should send a test email and return success', async () => {
      configService.getForOrg.mockResolvedValue(mockConfig);
      mockSendMail.mockResolvedValue(undefined);

      const result = await controller.testEmail(orgId, mockReq);

      expect(configService.getForOrg).toHaveBeenCalledWith(orgId);
      expect(mockSendMail).toHaveBeenCalledWith({
        to: 'admin@example.com',
        subject: 'Signage — Test Email',
        text: expect.stringContaining('test email'),
      });
      expect(result.message).toBe('Test email sent successfully.');
    });

    it('should throw 422 if SMTP is not configured', async () => {
      configService.getForOrg.mockResolvedValue(null);

      await expect(controller.testEmail(orgId, mockReq)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw 422 if SMTP host is missing', async () => {
      configService.getForOrg.mockResolvedValue({
        ...mockConfig,
        smtpHost: null,
      });

      await expect(controller.testEmail(orgId, mockReq)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw 422 if sending fails', async () => {
      configService.getForOrg.mockResolvedValue(mockConfig);
      mockSendMail.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.testEmail(orgId, mockReq)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('refuses to dial a host that resolves internally', async () => {
      configService.getForOrg.mockResolvedValue(mockConfig);
      outbound.assertHost.mockRejectedValue(new Error('Host points at a private address'));

      await expect(controller.testEmail(orgId, mockReq)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('never leaks the underlying error — the message must not be an oracle', async () => {
      configService.getForOrg.mockResolvedValue(mockConfig);
      mockSendMail.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:6379'));

      await expect(controller.testEmail(orgId, mockReq)).rejects.toThrow(
        'Failed to send the test email. Check the SMTP settings and try again.',
      );
    });
  });

  describe('testNtfy', () => {
    it('should send a test ntfy notification and return success', async () => {
      configService.getForOrg.mockResolvedValue(mockConfig);
      httpService.post.mockReturnValue(of({ status: 200, data: 'ok' }));

      const result = await controller.testNtfy(orgId);

      expect(configService.getForOrg).toHaveBeenCalledWith(orgId);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://ntfy.sh/my-topic',
        expect.stringContaining('test notification'),
        {
          headers: {
            'Content-Type': 'text/plain',
            Title: 'Signage — Test Notification',
            Authorization: 'Bearer token123',
          },
        },
      );
      expect(result.message).toBe('Test notification sent successfully.');
    });

    it('should not include Authorization header if no token', async () => {
      configService.getForOrg.mockResolvedValue({
        ...mockConfig,
        ntfyToken: null,
      });
      httpService.post.mockReturnValue(of({ status: 200, data: 'ok' }));

      await controller.testNtfy(orgId);

      expect(httpService.post).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
        headers: {
          'Content-Type': 'text/plain',
          Title: 'Signage — Test Notification',
        },
      });
    });

    it('should throw 422 if ntfy is not configured', async () => {
      configService.getForOrg.mockResolvedValue(null);

      await expect(controller.testNtfy(orgId)).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw 422 if ntfy URL is missing', async () => {
      configService.getForOrg.mockResolvedValue({
        ...mockConfig,
        ntfyUrl: null,
      });

      await expect(controller.testNtfy(orgId)).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw 422 if ntfy topic is missing', async () => {
      configService.getForOrg.mockResolvedValue({
        ...mockConfig,
        ntfyTopic: null,
      });

      await expect(controller.testNtfy(orgId)).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw 422 if HTTP request fails', async () => {
      configService.getForOrg.mockResolvedValue(mockConfig);
      httpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(controller.testNtfy(orgId)).rejects.toThrow(UnprocessableEntityException);
    });

    it('should strip trailing slashes from ntfy URL', async () => {
      configService.getForOrg.mockResolvedValue({
        ...mockConfig,
        ntfyUrl: 'https://ntfy.sh///',
      });
      httpService.post.mockReturnValue(of({ status: 200, data: 'ok' }));

      await controller.testNtfy(orgId);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://ntfy.sh/my-topic',
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});
