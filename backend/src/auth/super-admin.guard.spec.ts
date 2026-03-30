import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuperAdminGuard } from './super-admin.guard';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;
  let configService: jest.Mocked<ConfigService>;

  const createMockContext = (userId?: string): ExecutionContext => {
    const request = {
      user: userId ? { userId, email: 'test@example.com' } : undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    guard = new SuperAdminGuard(configService);
  });

  it('should allow access for a super-admin user', () => {
    configService.get.mockReturnValue('admin-1,admin-2');
    const context = createMockContext('admin-1');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access for a non-super-admin user', () => {
    configService.get.mockReturnValue('admin-1,admin-2');
    const context = createMockContext('regular-user');

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when no user is present', () => {
    configService.get.mockReturnValue('admin-1');
    const context = createMockContext();

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when SUPER_ADMIN_USER_IDS is empty', () => {
    configService.get.mockReturnValue('');
    const context = createMockContext('some-user');

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should handle whitespace in SUPER_ADMIN_USER_IDS', () => {
    configService.get.mockReturnValue(' admin-1 , admin-2 ');
    const context = createMockContext('admin-2');

    expect(guard.canActivate(context)).toBe(true);
  });
});
