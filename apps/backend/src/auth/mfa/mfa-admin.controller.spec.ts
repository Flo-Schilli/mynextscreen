import { MfaSuperAdminController, OrgMfaController } from './mfa-admin.controller';
import type { MfaAdminService } from './mfa-admin.service';
import type { AuthenticatedRequest } from '../jwt-auth.guard';

describe('MFA admin controllers', () => {
  const user = { userId: 'actor-1', email: 'a@example.com', isSuperAdmin: false, mfa: true };
  const req = { user } as AuthenticatedRequest;
  let service: Record<
    'resetBySuperAdmin' | 'resetByOrgAdmin' | 'getOrgRequirement' | 'setOrgRequirement',
    jest.Mock
  >;

  beforeEach(() => {
    service = {
      resetBySuperAdmin: jest.fn().mockResolvedValue(undefined),
      resetByOrgAdmin: jest.fn().mockResolvedValue(undefined),
      getOrgRequirement: jest.fn().mockResolvedValue({ requireMfa: false, requireMfaSince: null }),
      setOrgRequirement: jest.fn().mockResolvedValue({ requireMfa: true, requireMfaSince: 'x' }),
    };
  });

  it('super-admin reset passes the target and the acting session', async () => {
    const controller = new MfaSuperAdminController(service as unknown as MfaAdminService);
    await controller.reset('target-1', req);
    expect(service.resetBySuperAdmin).toHaveBeenCalledWith('target-1', user);
  });

  it('org routes pass the org from the path and the acting session', async () => {
    const controller = new OrgMfaController(service as unknown as MfaAdminService);

    await expect(controller.getRequirement('org-1')).resolves.toEqual({
      requireMfa: false,
      requireMfaSince: null,
    });
    await controller.setRequirement('org-1', { requireMfa: true }, req);
    await controller.resetMember('org-1', 'target-1', req);

    expect(service.getOrgRequirement).toHaveBeenCalledWith('org-1');
    expect(service.setOrgRequirement).toHaveBeenCalledWith('org-1', true, user);
    expect(service.resetByOrgAdmin).toHaveBeenCalledWith('org-1', 'target-1', user);
  });
});
