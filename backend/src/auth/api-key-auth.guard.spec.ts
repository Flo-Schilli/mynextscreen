import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import { Screen } from '../screen/screen.entity';
import { hashApiKey } from '../screen/api-key.util';

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;
  let reflector: Reflector;
  let screenRepository: jest.Mocked<Repository<Screen>>;

  const VALID_API_KEY = 'test-api-key-1234567890abcdef';
  let validKeyHash: string;

  const mockScreen = {
    id: 'screen-uuid-1',
    organisationId: 'org-uuid-1',
    apiKeyHash: '', // set in beforeAll
  } as Screen;

  beforeAll(async () => {
    validKeyHash = await hashApiKey(VALID_API_KEY);
    mockScreen.apiKeyHash = validKeyHash;
  });

  beforeEach(() => {
    reflector = new Reflector();
    screenRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<Screen>>;

    guard = new ApiKeyAuthGuard(reflector, screenRepository);
  });

  function createMockContext(
    headers: Record<string, string> = {},
    isScreenAuth = true,
  ): ExecutionContext {
    const request = {
      headers,
      screenId: undefined as string | undefined,
      organisationId: undefined as string | undefined,
    };

    const mockContext = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_SCREEN_AUTH_KEY) return isScreenAuth;
      return false;
    });

    return mockContext;
  }

  describe('non-screen-auth routes', () => {
    it('should skip and allow access when route is not @ScreenAuth()', async () => {
      const context = createMockContext({}, false);
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(screenRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('missing header', () => {
    it('should throw UnauthorizedException when no Authorization header', async () => {
      const context = createMockContext({});
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Missing API key');
    });

    it('should throw UnauthorizedException when Authorization has no Bearer scheme', async () => {
      const context = createMockContext({ authorization: 'Basic abc123' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Bearer token is empty', async () => {
      const context = createMockContext({ authorization: 'Bearer ' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('invalid key', () => {
    it('should throw UnauthorizedException when API key does not match any screen', async () => {
      screenRepository.find.mockResolvedValue([mockScreen]);

      const context = createMockContext({
        authorization: 'Bearer wrong-api-key',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid API key');
    });

    it('should throw UnauthorizedException when no screens exist', async () => {
      screenRepository.find.mockResolvedValue([]);

      const context = createMockContext({
        authorization: `Bearer ${VALID_API_KEY}`,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('valid key', () => {
    it('should allow access and attach screenId and organisationId to request', async () => {
      screenRepository.find.mockResolvedValue([mockScreen]);

      const context = createMockContext({
        authorization: `Bearer ${VALID_API_KEY}`,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.screenId).toBe('screen-uuid-1');
      expect(request.organisationId).toBe('org-uuid-1');
    });

    it('should match the correct screen among multiple screens', async () => {
      const otherScreen = {
        id: 'screen-uuid-2',
        organisationId: 'org-uuid-2',
        apiKeyHash: await hashApiKey('other-api-key'),
      } as Screen;

      screenRepository.find.mockResolvedValue([otherScreen, mockScreen]);

      const context = createMockContext({
        authorization: `Bearer ${VALID_API_KEY}`,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.screenId).toBe('screen-uuid-1');
      expect(request.organisationId).toBe('org-uuid-1');
    });
  });
});
