import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetupAuthGuard } from './setup-auth.guard';
import { SetupPinService } from './setup-pin.service';
import { IS_SETUP_PUBLIC_KEY } from './setup-public.decorator';

describe('SetupAuthGuard', () => {
  let guard: SetupAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  const pins = new SetupPinService('1234-5678');

  function contextWith(headers: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new SetupAuthGuard(reflector as unknown as Reflector, pins);
  });

  it('lets a correct PIN through', () => {
    expect(guard.canActivate(contextWith({ 'x-setup-pin': '1234-5678' }))).toBe(true);
  });

  it('rejects a wrong PIN', () => {
    expect(() => guard.canActivate(contextWith({ 'x-setup-pin': 'nope' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a missing PIN', () => {
    expect(() => guard.canActivate(contextWith({}))).toThrow(UnauthorizedException);
  });

  // The status view carries nothing secret, so requiring the PIN for it would
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
    it('stops answering after five wrong attempts', () => {
      for (let i = 0; i < 5; i += 1) {
        expect(() => guard.canActivate(contextWith({ 'x-setup-pin': 'nope' }))).toThrow(
          /Invalid setup PIN/,
        );
      }

      expect(() => guard.canActivate(contextWith({ 'x-setup-pin': 'nope' }))).toThrow(
        /Too many attempts/,
      );
    });

    // An eight-digit PIN is only a hurdle if it cannot be searched; without
    // this, a LAN attacker walks the space in minutes.
    it('refuses even the correct PIN while rate limited', () => {
      for (let i = 0; i < 5; i += 1) {
        try {
          guard.canActivate(contextWith({ 'x-setup-pin': 'nope' }));
        } catch {
          // counted
        }
      }

      expect(() => guard.canActivate(contextWith({ 'x-setup-pin': '1234-5678' }))).toThrow(
        /Too many attempts/,
      );
    });

    it('forgives the attempts once the window has passed', () => {
      jest.useFakeTimers();
      try {
        for (let i = 0; i < 5; i += 1) {
          try {
            guard.canActivate(contextWith({ 'x-setup-pin': 'nope' }));
          } catch {
            // counted
          }
        }
        jest.advanceTimersByTime(61_000);

        expect(guard.canActivate(contextWith({ 'x-setup-pin': '1234-5678' }))).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });

    it('resets the counter after a successful attempt', () => {
      for (let i = 0; i < 4; i += 1) {
        try {
          guard.canActivate(contextWith({ 'x-setup-pin': 'nope' }));
        } catch {
          // counted
        }
      }

      guard.canActivate(contextWith({ 'x-setup-pin': '1234-5678' }));

      for (let i = 0; i < 4; i += 1) {
        expect(() => guard.canActivate(contextWith({ 'x-setup-pin': 'nope' }))).toThrow(
          /Invalid setup PIN/,
        );
      }
    });
  });
});
