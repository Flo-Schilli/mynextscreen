import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { __setHankoFactory, __resetHankoFactory } from '../../testing/hanko-elements.mock';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface HankoSession {
  is_valid: boolean;
}

interface HankoMock {
  validateSession: ReturnType<typeof vi.fn>;
  getSessionToken: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  onSessionCreated: ReturnType<typeof vi.fn>;
  onSessionExpired: ReturnType<typeof vi.fn>;
}

// Holds the most recently constructed Hanko mock so tests can configure it.
let lastHanko: HankoMock;

// Swappable behavior for the constructor-time validateSession call. Tests set this
// BEFORE injecting AuthService to drive checkSession() executed in the constructor.
let initialValidateSession: () => Promise<HankoSession>;

function buildHankoMock(): HankoMock {
  return {
    // Default delegates to the swappable initial behavior so the constructor's
    // checkSession() can be steered per test before injection.
    validateSession: vi.fn(() => initialValidateSession()),
    getSessionToken: vi.fn(),
    logout: vi.fn(),
    onSessionCreated: vi.fn(),
    onSessionExpired: vi.fn(),
  };
}

import { AuthService } from './auth.service';

/**
 * Creates a fresh AuthService. The Hanko mock is constructed during the field
 * initializer, so configure `lastHanko` AFTER calling this (the constructor's
 * checkSession() resolves asynchronously and can be awaited via the microtask queue).
 */
function createService(): AuthService {
  return TestBed.inject(AuthService);
}

// Flushes pending microtasks so the async checkSession() in the constructor settles.
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('AuthService', () => {
  beforeEach(() => {
    // `@teamhanko/hanko-elements` is aliased to a test double (see
    // vitest.config.ts). Its `Hanko` constructor delegates to the factory
    // installed here, yielding a fresh mock per instantiation captured in
    // `lastHanko` for assertions.
    __setHankoFactory(() => {
      lastHanko = buildHankoMock();
      return lastHanko;
    });
    // Default: constructor-time session check resolves to an invalid session.
    initialValidateSession = () => Promise.resolve({ is_valid: false });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), AuthService],
    });
  });

  afterEach(() => {
    __resetHankoFactory();
    vi.clearAllMocks();
  });

  describe('construction', () => {
    it('registers Hanko session lifecycle listeners', () => {
      // Act
      createService();

      // Assert
      expect(lastHanko.onSessionCreated).toHaveBeenCalledTimes(1);
      expect(lastHanko.onSessionExpired).toHaveBeenCalledTimes(1);
    });
  });

  describe('isValid', () => {
    it('returns true when the session is valid', async () => {
      // Arrange
      const service = createService();
      lastHanko.validateSession.mockResolvedValue({ is_valid: true } satisfies HankoSession);

      // Act
      const result = await service.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('returns false when the session is invalid', async () => {
      // Arrange
      const service = createService();
      lastHanko.validateSession.mockResolvedValue({ is_valid: false } satisfies HankoSession);

      // Act
      const result = await service.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('returns false when validateSession rejects', async () => {
      // Arrange
      const service = createService();
      lastHanko.validateSession.mockRejectedValue(new Error('network down'));

      // Act
      const result = await service.isValid();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getToken', () => {
    it('delegates to hanko.getSessionToken and returns its value', () => {
      // Arrange
      const service = createService();
      lastHanko.getSessionToken.mockReturnValue('jwt-token-123');

      // Act
      const token = service.getToken();

      // Assert
      expect(lastHanko.getSessionToken).toHaveBeenCalledTimes(1);
      expect(token).toBe('jwt-token-123');
    });
  });

  describe('logout', () => {
    it('calls hanko.logout and clears the current user', async () => {
      // Arrange
      const service = createService();
      lastHanko.logout.mockResolvedValue(undefined);

      // Act
      await service.logout();

      // Assert
      expect(lastHanko.logout).toHaveBeenCalledTimes(1);
      const user = await firstValueFrom(service.currentUser$);
      expect(user).toBeNull();
    });
  });

  describe('currentUser$ via checkSession', () => {
    it('emits the session when validateSession resolves a valid session on construction', async () => {
      // Arrange
      const session = { is_valid: true };
      initialValidateSession = () => Promise.resolve(session);

      // Act
      const service = createService();
      await flushMicrotasks();

      // Assert
      const user = await firstValueFrom(service.currentUser$);
      expect(user).toEqual(session);
    });

    it('emits null when validateSession resolves an invalid session on construction', async () => {
      // Arrange
      initialValidateSession = () => Promise.resolve({ is_valid: false });

      // Act
      const service = createService();
      await flushMicrotasks();

      // Assert
      const user = await firstValueFrom(service.currentUser$);
      expect(user).toBeNull();
    });

    it('emits null when validateSession rejects on construction', async () => {
      // Arrange
      initialValidateSession = () => Promise.reject(new Error('boom'));

      // Act
      const service = createService();
      await flushMicrotasks();

      // Assert
      const user = await firstValueFrom(service.currentUser$);
      expect(user).toBeNull();
    });

    it('re-checks the session when the onSessionCreated callback fires', async () => {
      // Arrange
      const service = createService();
      await flushMicrotasks();
      // Capture the callback Hanko registered during construction.
      const onCreated = lastHanko.onSessionCreated.mock.calls[0][0] as () => void;
      lastHanko.validateSession.mockResolvedValue({ is_valid: true });

      // Act
      onCreated();
      await flushMicrotasks();

      // Assert
      const user = await firstValueFrom(service.currentUser$);
      expect(user).toEqual({ is_valid: true });
    });

    it('clears the current user when the onSessionExpired callback fires', async () => {
      // Arrange
      const service = createService();
      const onExpired = lastHanko.onSessionExpired.mock.calls[0][0] as () => void;

      // Act
      onExpired();

      // Assert
      const user = await firstValueFrom(service.currentUser$);
      expect(user).toBeNull();
    });
  });
});
