import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;

  const createMockContext = (user?: {
    userId: string;
    email: string;
    isSuperAdmin: boolean;
  }): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new SuperAdminGuard();
  });

  it('allows access for a super-admin user', () => {
    const context = createMockContext({ userId: 'u1', email: 'a@example.com', isSuperAdmin: true });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access for a non-super-admin user', () => {
    const context = createMockContext({
      userId: 'u1',
      email: 'a@example.com',
      isSuperAdmin: false,
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('denies access when no user is present', () => {
    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
