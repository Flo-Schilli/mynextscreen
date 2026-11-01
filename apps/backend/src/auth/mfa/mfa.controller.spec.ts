import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AuthService } from '../auth.service';
import type { AuthenticatedRequest } from '../jwt-auth.guard';
import { MfaController } from './mfa.controller';
import type { MfaService } from './mfa.service';

describe('MfaController', () => {
  const session = {
    accessToken: { token: 'access', jti: 'j', expiresAt: new Date(Date.now() + 1000) },
    refreshToken: { token: 'refresh', familyId: 'f', expiresAt: new Date(Date.now() + 1000) },
  };
  const user = { id: 'u1', email: 'u@example.com', isSuperAdmin: true };
  const req = {
    user: { userId: 'u1', email: 'u@example.com', isSuperAdmin: true, mfa: false },
  } as AuthenticatedRequest;

  let mfa: Record<string, jest.Mock>;
  let auth: { replaceAllSessions: jest.Mock };
  let res: { cookie: jest.Mock };
  let controller: MfaController;

  beforeEach(() => {
    mfa = {
      getStatus: jest.fn(),
      startEnrolment: jest.fn(),
      confirmEnrolment: jest.fn(),
      disable: jest.fn(),
      regenerateRecoveryCodes: jest.fn(),
    };
    auth = { replaceAllSessions: jest.fn().mockResolvedValue(session) };
    res = { cookie: jest.fn() };
    const config = { get: jest.fn((_k: string, fallback?: unknown) => fallback) };
    controller = new MfaController(
      mfa as unknown as MfaService,
      auth as unknown as AuthService,
      config as unknown as ConfigService,
    );
  });

  it('returns the status of the calling user', async () => {
    mfa.getStatus.mockResolvedValue({ totpEnabled: false });
    await expect(controller.status(req)).resolves.toEqual({ totpEnabled: false });
    expect(mfa.getStatus).toHaveBeenCalledWith('u1');
  });

  it('starts enrolment with password and optional current code', async () => {
    mfa.startEnrolment.mockResolvedValue({ otpauthUri: 'uri', qrDataUrl: 'qr', secret: 's' });
    await controller.setup(req, { currentPassword: 'pw', code: '123456' });
    expect(mfa.startEnrolment).toHaveBeenCalledWith('u1', 'pw', '123456');
  });

  it('confirms, replaces all sessions with an MFA one and returns the codes', async () => {
    mfa.confirmEnrolment.mockResolvedValue({ user, recoveryCodes: ['a'], replaced: false });

    const result = await controller.confirm(req, { code: '123456' }, res as unknown as Response);

    expect(result).toEqual({ recoveryCodes: ['a'] });
    expect(auth.replaceAllSessions).toHaveBeenCalledWith(user, { mfa: true });
    expect(res.cookie).toHaveBeenCalledWith('access_token', 'access', expect.anything());
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh', expect.anything());
  });

  it('disables and starts the sessions over without mfa', async () => {
    mfa.disable.mockResolvedValue(user);

    await controller.disable(
      req,
      { currentPassword: 'pw', code: '123456' },
      res as unknown as Response,
    );

    expect(mfa.disable).toHaveBeenCalledWith('u1', 'pw', '123456');
    expect(auth.replaceAllSessions).toHaveBeenCalledWith(user, { mfa: false });
    expect(res.cookie).toHaveBeenCalledTimes(2);
  });

  it('regenerates recovery codes', async () => {
    mfa.regenerateRecoveryCodes.mockResolvedValue(['x', 'y']);
    await expect(controller.regenerate(req, { code: '123456' })).resolves.toEqual({
      recoveryCodes: ['x', 'y'],
    });
  });
});
