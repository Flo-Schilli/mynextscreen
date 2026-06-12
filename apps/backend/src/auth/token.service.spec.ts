import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Redis } from 'ioredis';
import { TokenService } from './token.service';

const SECRET = 'test-access-secret';

function makeConfig(): ConfigService {
  const values: Record<string, string> = {
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '30d',
    JWT_ACCESS_SECRET: SECRET,
  };
  return {
    get: (key: string, def?: string) => values[key] ?? def,
    getOrThrow: (key: string) => {
      const v = values[key];
      if (v === undefined) throw new Error(`missing ${key}`);
      return v;
    },
  } as unknown as ConfigService;
}

describe('TokenService', () => {
  let jwt: JwtService;
  let redis: {
    eval: jest.Mock;
    get: jest.Mock;
    smembers: jest.Mock;
    del: jest.Mock;
    multi: jest.Mock;
  };
  let multiChain: { set: jest.Mock; sadd: jest.Mock; expire: jest.Mock; exec: jest.Mock };
  let service: TokenService;

  beforeEach(() => {
    jwt = new JwtService({ secret: SECRET });
    multiChain = {
      set: jest.fn().mockReturnThis(),
      sadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    redis = {
      eval: jest.fn(),
      get: jest.fn(),
      smembers: jest.fn(),
      del: jest.fn(),
      multi: jest.fn().mockReturnValue(multiChain),
    };
    service = new TokenService(jwt, makeConfig(), redis as unknown as Redis);
  });

  describe('access tokens', () => {
    it('issues and verifies an access token carrying claims', async () => {
      const issued = await service.issueAccessToken('user-1', {
        email: 'a@example.com',
        isSuperAdmin: true,
      });
      expect(issued.token).toBeTruthy();
      expect(issued.jti).toBeTruthy();

      const payload = await service.verifyAccessToken(issued.token);
      expect(payload.sub).toBe('user-1');
      expect(payload.email).toBe('a@example.com');
      expect(payload.isSuperAdmin).toBe(true);
      expect(payload.jti).toBe(issued.jti);
    });

    it('rejects a token signed with a different secret', async () => {
      const foreign = new JwtService({ secret: 'other' });
      const bad = await foreign.signAsync({ sub: 'x', email: 'e', isSuperAdmin: false, jti: 'j' });
      await expect(service.verifyAccessToken(bad)).rejects.toBeDefined();
    });
  });

  describe('refresh tokens', () => {
    it('persists a new refresh token in a family', async () => {
      const issued = await service.issueInitialRefreshToken('user-1');
      expect(issued.token).toBeTruthy();
      expect(issued.familyId).toBeTruthy();
      expect(multiChain.set).toHaveBeenCalled();
      expect(multiChain.sadd).toHaveBeenCalled();
      expect(multiChain.expire).toHaveBeenCalled();
    });

    it('rotates a valid refresh token', async () => {
      redis.eval.mockResolvedValueOnce(['ok', 'family-1', 'user-1']);
      const result = await service.rotateRefreshToken('raw-old');
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.userId).toBe('user-1');
        expect(result.familyId).toBe('family-1');
        expect(result.next.token).toBeTruthy();
      }
    });

    it('returns unknown for an unrecognised refresh token', async () => {
      redis.eval.mockResolvedValueOnce(['unknown']);
      const result = await service.rotateRefreshToken('raw-unknown');
      expect(result.status).toBe('unknown');
    });

    it('detects reuse and revokes the family', async () => {
      redis.eval
        .mockResolvedValueOnce(['reuse', 'family-9']) // rotate
        .mockResolvedValueOnce(2); // revokeFamily
      const result = await service.rotateRefreshToken('raw-replayed');
      expect(result.status).toBe('reuse');
      // second eval call is the family revoke
      expect(redis.eval).toHaveBeenCalledTimes(2);
    });

    it('revokes a token family by raw token', async () => {
      redis.get.mockResolvedValueOnce(
        JSON.stringify({ userId: 'u', familyId: 'fam-1', issuedAt: 1 }),
      );
      redis.eval.mockResolvedValueOnce(1);
      const familyId = await service.revokeToken('raw');
      expect(familyId).toBe('fam-1');
    });

    it('returns null when revoking an unknown raw token', async () => {
      redis.get.mockResolvedValueOnce(null);
      const familyId = await service.revokeToken('raw');
      expect(familyId).toBeNull();
    });

    it('records the family in the per-user index on issue', async () => {
      await service.issueInitialRefreshToken('user-7');
      expect(multiChain.sadd).toHaveBeenCalledWith('auth:userfamilies:user-7', expect.any(String));
    });
  });

  describe('revokeAllForUser', () => {
    it('revokes every family in the user index and drops the index', async () => {
      redis.smembers.mockResolvedValueOnce(['fam-a', 'fam-b']);
      redis.eval.mockResolvedValue(1);

      const count = await service.revokeAllForUser('user-1');

      expect(count).toBe(2);
      expect(redis.smembers).toHaveBeenCalledWith('auth:userfamilies:user-1');
      expect(redis.eval).toHaveBeenCalledWith(expect.any(String), 1, 'auth:family:fam-a');
      expect(redis.eval).toHaveBeenCalledWith(expect.any(String), 1, 'auth:family:fam-b');
      expect(redis.del).toHaveBeenCalledWith('auth:userfamilies:user-1');
    });

    it('returns 0 when the user has no families', async () => {
      redis.smembers.mockResolvedValueOnce([]);
      const count = await service.revokeAllForUser('user-1');
      expect(count).toBe(0);
      expect(redis.eval).not.toHaveBeenCalled();
    });
  });
});
