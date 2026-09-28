import { NtfyNotificationChannel } from './ntfy-notification-channel.service';
import { NotificationEventType } from '../notification-event-type.enum';
import { NotificationPayload } from './notification-channel.interfaces';
import { OrgNotificationConfigService } from '../org-notification-config.service';
import { OutboundGuard } from '../../common/outbound-guard.service';
import type { OrganisationNotificationConfig } from '../../db/schema';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('NtfyNotificationChannel', () => {
  let channel: NtfyNotificationChannel;
  let httpService: { post: jest.Mock };
  let orgConfigService: { getForOrg: jest.Mock };

  const orgId = 'org-1';
  const payload: NotificationPayload = {
    eventType: NotificationEventType.SCREEN_OFFLINE,
    title: 'Screen offline',
    message: 'Screen "Main Hall" has gone offline',
    resourceId: 'screen-1',
  };

  const mockOrgConfig: Partial<OrganisationNotificationConfig> = {
    ntfyUrl: 'https://ntfy.example.com',
    ntfyTopic: 'mynextscreen-alerts',
    ntfyToken: 'tk_secret123',
  };

  let outbound: { assertUrl: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    httpService = {
      post: jest.fn().mockReturnValue(of({ status: 200 } as AxiosResponse)),
    };
    orgConfigService = {
      getForOrg: jest.fn().mockResolvedValue(mockOrgConfig),
    };

    outbound = { assertUrl: jest.fn().mockResolvedValue(new URL('https://ntfy.example.com')) };

    channel = new NtfyNotificationChannel(
      httpService as unknown as HttpService,
      orgConfigService as unknown as OrgNotificationConfigService,
      outbound as unknown as OutboundGuard,
    );
  });

  it('should POST to the correct URL with headers and body', async () => {
    await channel.send(orgId, payload);

    expect(orgConfigService.getForOrg).toHaveBeenCalledWith(orgId);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://ntfy.example.com/mynextscreen-alerts',
      'Screen "Main Hall" has gone offline',
      {
        headers: {
          'Content-Type': 'text/plain',
          Title: 'Screen offline',
          Authorization: 'Bearer tk_secret123',
        },
      },
    );
  });

  it('should omit Authorization header when ntfyToken is null', async () => {
    orgConfigService.getForOrg.mockResolvedValue({
      ...mockOrgConfig,
      ntfyToken: null,
    });

    await channel.send(orgId, payload);

    expect(httpService.post).toHaveBeenCalledWith(
      'https://ntfy.example.com/mynextscreen-alerts',
      payload.message,
      {
        headers: {
          'Content-Type': 'text/plain',
          Title: 'Screen offline',
        },
      },
    );
  });

  it('should strip trailing slashes from ntfyUrl', async () => {
    orgConfigService.getForOrg.mockResolvedValue({
      ...mockOrgConfig,
      ntfyUrl: 'https://ntfy.example.com/',
    });

    await channel.send(orgId, payload);

    expect(httpService.post).toHaveBeenCalledWith(
      'https://ntfy.example.com/mynextscreen-alerts',
      payload.message,
      expect.any(Object),
    );
  });

  it('should skip silently when ntfyUrl is missing', async () => {
    orgConfigService.getForOrg.mockResolvedValue({
      ...mockOrgConfig,
      ntfyUrl: null,
    });

    await channel.send(orgId, payload);

    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('should skip silently when ntfyTopic is missing', async () => {
    orgConfigService.getForOrg.mockResolvedValue({
      ...mockOrgConfig,
      ntfyTopic: null,
    });

    await channel.send(orgId, payload);

    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('should skip silently when org config is null', async () => {
    orgConfigService.getForOrg.mockResolvedValue(null);

    await channel.send(orgId, payload);

    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('should not throw on non-2xx response (logs warning instead)', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new Error('Request failed with status code 403')),
    );

    await expect(channel.send(orgId, payload)).resolves.toBeUndefined();
  });

  it('should not throw on network error (logs warning instead)', async () => {
    httpService.post.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));

    await expect(channel.send(orgId, payload)).resolves.toBeUndefined();
  });

  it('does not send when the target is blocked as internal', async () => {
    outbound.assertUrl.mockRejectedValue(new Error('Host points at the local machine'));

    await channel.send(orgId, payload);

    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('escapes the topic so it cannot walk the target path', async () => {
    orgConfigService.getForOrg.mockResolvedValue({ ...mockOrgConfig, ntfyTopic: '../admin' });

    await channel.send(orgId, payload);

    expect(httpService.post).toHaveBeenCalledWith(
      'https://ntfy.example.com/..%2Fadmin',
      expect.anything(),
      expect.anything(),
    );
  });
});
