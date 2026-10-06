import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetupAuthGuard } from './setup-auth.guard';
import { IS_SETUP_PUBLIC_KEY } from './setup-public.decorator';

describe('SetupAuthGuard', () => {
  let guard: SetupAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  function contextWith(headers: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new SetupAuthGuard(reflector as unknown as Reflector);
  });

  it('lets a request carrying a setup code through', () => {
    expect(guard.canActivate(contextWith({ 'x-setup-code': 'fresh-code' }))).toBe(true);
  });

  it('rejects a missing setup code', () => {
    expect(() => guard.canActivate(contextWith({}))).toThrow(UnauthorizedException);
  });

  it('rejects a blank setup code', () => {
    expect(() => guard.canActivate(contextWith({ 'x-setup-code': '   ' }))).toThrow(
      UnauthorizedException,
    );
  });

  // The status view carries nothing secret, so requiring a code for it would
  // only stop an operator seeing whether the agent is connected.
  it('skips the check on routes marked setup-public', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    expect(guard.canActivate(contextWith({}))).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_SETUP_PUBLIC_KEY, [
      undefined,
      undefined,
    ]);
  });

  describe('rate limiting', () => {
    it('stops answering after ten code-less attempts', () => {
      for (let i = 0; i < 10; i += 1) {
        expect(() => guard.canActivate(contextWith({}))).toThrow(/setup code/);
      }

      expect(() => guard.canActivate(contextWith({}))).toThrow(/Too many attempts/);
    });

    it('refuses even a supplied code while rate limited', () => {
      for (let i = 0; i < 10; i += 1) {
        try {
          guard.canActivate(contextWith({}));
        } catch {
          // counted
        }
      }

      expect(() => guard.canActivate(contextWith({ 'x-setup-code': 'fresh-code' }))).toThrow(
        /Too many attempts/,
      );
    });

    it('forgives the attempts once the window has passed', () => {
      jest.useFakeTimers();
      try {
        for (let i = 0; i < 10; i += 1) {
          try {
            guard.canActivate(contextWith({}));
          } catch {
            // counted
          }
        }
        jest.advanceTimersByTime(61_000);

        expect(guard.canActivate(contextWith({ 'x-setup-code': 'fresh-code' }))).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });

    it('resets the counter after a successful attempt', () => {
      for (let i = 0; i < 9; i += 1) {
        try {
          guard.canActivate(contextWith({}));
        } catch {
          // counted
        }
      }

      guard.canActivate(contextWith({ 'x-setup-code': 'fresh-code' }));

      for (let i = 0; i < 9; i += 1) {
        expect(() => guard.canActivate(contextWith({}))).toThrow(/setup code/);
      }
    });
  });
});
