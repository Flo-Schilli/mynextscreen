import { randomBytes } from 'node:crypto';
import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { User } from '../db/schema';
import { UserService } from '../user/user.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { LoginResult, RefreshResult } from './auth.types';

const PASSWORD_RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Internal email+password authentication: validate credentials, issue an access
 * JWT + opaque refresh token, rotate/revoke refresh tokens, and drive the
 * set-password / forgot-password flows. There is intentionally no open
 * registration — users are provisioned by admins (see MembershipService).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UserService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.users.findByEmail(email);
    // Reject unknown accounts AND invitees that have no password yet (null hash).
    const valid = await this.passwords.verify(user?.passwordHash, password);
    if (!user || !valid) {
      this.logger.warn('Login failed: invalid credentials');
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = await this.tokens.issueAccessToken(user.id, {
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    });
    const refreshToken = await this.tokens.issueInitialRefreshToken(user.id);
    this.logger.log(`Login success userId=${user.id} family=${refreshToken.familyId}`);
    return { user, accessToken, refreshToken };
  }

  /**
   * First-run setup: create the first system super-admin (UI-driven, replaces
   * env seeding) and immediately log them in — same token issuance as login().
   * Atomicity / "setup already done" guard lives in createFirstSuperAdmin.
   */
  async setupFirstSuperAdmin(email: string, password: string, name?: string): Promise<LoginResult> {
    const passwordHash = await this.passwords.hash(password);
    const user = await this.users.createFirstSuperAdmin(email, passwordHash, name ?? null);
    const accessToken = await this.tokens.issueAccessToken(user.id, {
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    });
    const refreshToken = await this.tokens.issueInitialRefreshToken(user.id);
    this.logger.log(`First super-admin created userId=${user.id} family=${refreshToken.familyId}`);
    return { user, accessToken, refreshToken };
  }

  async refresh(rawRefreshToken: string): Promise<RefreshResult> {
    const result = await this.tokens.rotateRefreshToken(rawRefreshToken);

    if (result.status === 'unknown') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (result.status === 'reuse') {
      this.logger.warn(`Refresh token reuse detected for family ${result.familyId}`);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const user = await this.users.findById(result.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const accessToken = await this.tokens.issueAccessToken(user.id, {
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    });
    this.logger.log(`Refresh rotated userId=${result.userId} family=${result.familyId}`);
    return { userId: result.userId, accessToken, refreshToken: result.next };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const familyId = await this.tokens.revokeToken(rawRefreshToken);
    if (familyId) {
      this.logger.log(`Logout family=${familyId}`);
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const valid = await this.passwords.verify(user.passwordHash, currentPassword);
    if (!valid) {
      this.logger.warn(`Change password failed userId=${userId}`);
      throw new UnauthorizedException('Current password is incorrect');
    }
    const hash = await this.passwords.hash(newPassword);
    await this.users.setPassword(userId, hash);
    this.logger.log(`Password changed userId=${userId}`);
  }

  /**
   * Accept-invite / password-reset: the token must be valid and unexpired. On
   * success the password is set and the token cleared.
   */
  async setPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.users.findByPasswordResetToken(token);
    if (
      !user ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundException('Invalid or expired token');
    }
    const hash = await this.passwords.hash(newPassword);
    await this.users.setPassword(user.id, hash);
    this.logger.log(`Password set via token userId=${user.id}`);
  }

  /**
   * Enumeration-safe: always returns void. Issues a reset token and (best-effort)
   * emails it via the org's SMTP config. The caller (controller) wires the email
   * send so AuthService stays free of org-context lookups for unknown accounts.
   */
  async createPasswordResetToken(user: User): Promise<string> {
    const token = generateUrlSafeToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    await this.users.setPasswordResetToken(user.id, token, expiresAt);
    return token;
  }
}

export function generateUrlSafeToken(): string {
  return randomBytes(32).toString('base64url');
}
