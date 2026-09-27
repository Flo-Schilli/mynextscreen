import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis';
import { REVOKE_FAMILY_SCRIPT, ROTATE_REFRESH_SCRIPT } from './token.scripts';
import type {
  AccessTokenPayload,
  IssuedAccessToken,
  IssuedRefreshToken,
  RotateResult,
} from './token.types';
import { parseTtlToSeconds } from './ttl.util';

const REFRESH_TOKEN_BYTES = 32;

interface RefreshRecord {
  userId: string;
  familyId: string;
  issuedAt: number;
  parentHash?: string;
}

export interface AccessClaims {
  email: string;
  isSuperAdmin: boolean;
}

/**
 * Issues short-lived access JWTs (HS256, `@nestjs/jwt`) and manages opaque
 * refresh tokens in Redis with per-family tracking, atomic rotation and
 * reuse-detection. Direct port of the immich-upload-portal reference.
 */
/** Pinned JWT parameters; verification rejects anything that deviates. */
const ACCESS_TOKEN_ALGORITHM = 'HS256' as const;
const ACCESS_TOKEN_ISSUER = 'signage-server';
const ACCESS_TOKEN_AUDIENCE = 'signage-api';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;
  private readonly accessSecret: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.accessTtlSeconds = parseTtlToSeconds(this.config.get<string>('JWT_ACCESS_TTL', '15m'));
    this.refreshTtlSeconds = parseTtlToSeconds(this.config.get<string>('JWT_REFRESH_TTL', '30d'));
    this.accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  async issueAccessToken(userId: string, claims: AccessClaims): Promise<IssuedAccessToken> {
    const jti = randomUUID();
    const token = await this.jwt.signAsync(
      { sub: userId, email: claims.email, isSuperAdmin: claims.isSuperAdmin, jti },
      {
        secret: this.accessSecret,
        expiresIn: this.accessTtlSeconds,
        algorithm: ACCESS_TOKEN_ALGORITHM,
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
      },
    );
    return {
      token,
      jti,
      expiresAt: new Date(Date.now() + this.accessTtlSeconds * 1000),
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    // Pinned explicitly: without `algorithms` the verifier accepts whatever the
    // token header claims, and without issuer/audience a token minted for some
    // other service that happens to share the secret would be accepted here.
    const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.accessSecret,
      algorithms: [ACCESS_TOKEN_ALGORITHM],
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
    });
    return {
      sub: payload.sub,
      email: payload.email,
      isSuperAdmin: payload.isSuperAdmin === true,
      jti: payload.jti,
    };
  }

  async issueInitialRefreshToken(userId: string): Promise<IssuedRefreshToken> {
    const familyId = randomUUID();
    return this.persistNewRefresh(userId, familyId);
  }

  async rotateRefreshToken(rawToken: string): Promise<RotateResult> {
    const oldHash = hashToken(rawToken);
    const newToken = generateRefreshToken();
    const newHash = hashToken(newToken);
    const issuedAt = Date.now();

    const result = (await this.redis.eval(
      ROTATE_REFRESH_SCRIPT,
      3,
      `auth:refresh:${oldHash}`,
      `auth:consumed:${oldHash}`,
      `auth:refresh:${newHash}`,
      oldHash,
      newHash,
      String(issuedAt),
      String(this.refreshTtlSeconds),
    )) as unknown[];

    const status = result[0] as string;
    if (status === 'unknown') {
      return { status: 'unknown' };
    }
    if (status === 'reuse') {
      const familyId = result[1] as string;
      this.logger.warn(`Refresh token reuse detected for family ${familyId}; killing family`);
      await this.revokeFamily(familyId);
      return { status: 'reuse', familyId };
    }

    const familyId = result[1] as string;
    const userId = result[2] as string;
    return {
      status: 'ok',
      userId,
      familyId,
      next: {
        token: newToken,
        familyId,
        expiresAt: new Date(issuedAt + this.refreshTtlSeconds * 1000),
      },
    };
  }

  async revokeFamily(familyId: string): Promise<number> {
    return (await this.redis.eval(REVOKE_FAMILY_SCRIPT, 1, `auth:family:${familyId}`)) as number;
  }

  /**
   * Revoke every refresh-token family ever issued to a user (used on account
   * deletion). Reads the per-user family index, revokes each family, then drops
   * the index. Returns the number of families revoked.
   */
  async revokeAllForUser(userId: string): Promise<number> {
    const familyIds = await this.redis.smembers(`auth:userfamilies:${userId}`);
    for (const familyId of familyIds) {
      await this.revokeFamily(familyId);
    }
    await this.redis.del(`auth:userfamilies:${userId}`);
    return familyIds.length;
  }

  async revokeToken(rawToken: string): Promise<string | null> {
    const hash = hashToken(rawToken);
    const data = await this.redis.get(`auth:refresh:${hash}`);
    if (!data) return null;
    const parsed = JSON.parse(data) as RefreshRecord;
    await this.revokeFamily(parsed.familyId);
    return parsed.familyId;
  }

  private async persistNewRefresh(userId: string, familyId: string): Promise<IssuedRefreshToken> {
    const token = generateRefreshToken();
    const hash = hashToken(token);
    const record: RefreshRecord = { userId, familyId, issuedAt: Date.now() };

    const multi = this.redis.multi();
    multi.set(`auth:refresh:${hash}`, JSON.stringify(record), 'EX', this.refreshTtlSeconds);
    multi.sadd(`auth:family:${familyId}`, hash);
    multi.expire(`auth:family:${familyId}`, this.refreshTtlSeconds);
    // Per-user family index so all of a user's tokens can be revoked at once
    // (account deletion). TTL refreshed on each new login.
    multi.sadd(`auth:userfamilies:${userId}`, familyId);
    multi.expire(`auth:userfamilies:${userId}`, this.refreshTtlSeconds);
    await multi.exec();

    return {
      token,
      familyId,
      expiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
    };
  }
}

function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
