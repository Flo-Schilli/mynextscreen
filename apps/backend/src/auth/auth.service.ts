import { randomBytes } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '../db/schema';
import { UserService } from '../user/user.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { LoginResult, RefreshResult } from './auth.types';

const PASSWORD_RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Distinct message so the SPA can offer a "resend verification" affordance. */
export const EMAIL_NOT_VERIFIED_MESSAGE = 'Email not verified';

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  organisationName: string;
  storageOriginalLimitBytes: number;
  storageTranscodedLimitBytes: number;
}

export interface RegisterResult {
  user: User;
  verificationToken: string;
}

export interface EmailChangeRequest {
  oldEmail: string;
  newEmail: string;
  changeToken: string;
}

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
    // Self-signup gate: credentials are correct but the email isn't confirmed.
    // Distinct from invalid-credentials so the SPA can offer "resend".
    if (!user.emailVerified) {
      this.logger.warn(`Login blocked, email not verified userId=${user.id}`);
      throw new ForbiddenException(EMAIL_NOT_VERIFIED_MESSAGE);
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

  /**
   * Self-signup: hash the password, mint a verification token, and atomically
   * create the user + their own org + OrgAdmin membership (all unverified). The
   * caller (controller) emails the verification link. No tokens are issued here
   * — login stays blocked until the email is verified.
   */
  async register(input: RegisterInput): Promise<RegisterResult> {
    const passwordHash = await this.passwords.hash(input.password);
    const verificationToken = generateUrlSafeToken();
    const user = await this.users.createUserWithOrganisation({
      email: input.email,
      passwordHash,
      name: input.name ?? null,
      organisationName: input.organisationName,
      verificationToken,
      verificationTokenExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
      storageOriginalLimitBytes: input.storageOriginalLimitBytes,
      storageTranscodedLimitBytes: input.storageTranscodedLimitBytes,
    });
    this.logger.log(`Self-signup registered userId=${user.id}`);
    return { user, verificationToken };
  }

  /**
   * Confirm an email-verification token and auto-login: on success mark verified,
   * clear the token, and issue access + refresh tokens (same as login()).
   */
  async verifyEmail(token: string): Promise<LoginResult> {
    const user = await this.users.findByEmailVerificationToken(token);
    if (
      !user ||
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundException('Invalid or expired token');
    }
    await this.users.markEmailVerified(user.id);
    const accessToken = await this.tokens.issueAccessToken(user.id, {
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    });
    const refreshToken = await this.tokens.issueInitialRefreshToken(user.id);
    this.logger.log(`Email verified + auto-login userId=${user.id}`);
    return { user: { ...user, emailVerified: true }, accessToken, refreshToken };
  }

  /**
   * Issue a fresh verification token for an unverified user (resend flow).
   * Enumeration-safety is the caller's concern (always returns void / 204).
   */
  async createEmailVerificationToken(user: User): Promise<string> {
    const token = generateUrlSafeToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
    await this.users.setEmailVerificationToken(user.id, token, expiresAt);
    return token;
  }

  /**
   * Start an email change: verify the current password, park the new address as
   * `pendingEmail` behind a token, and return the addresses + token so the caller
   * emails a confirm link to the NEW address and a heads-up to the OLD one. The
   * change does not take effect until confirmEmailChange().
   */
  async changeEmail(
    userId: string,
    newEmail: string,
    currentPassword: string,
  ): Promise<EmailChangeRequest> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const valid = await this.passwords.verify(user.passwordHash, currentPassword);
    if (!valid) {
      this.logger.warn(`Change email failed: bad password userId=${userId}`);
      throw new UnauthorizedException('Current password is incorrect');
    }
    const changeToken = generateUrlSafeToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
    const normalisedNew = newEmail.toLowerCase();
    await this.users.setPendingEmail(userId, normalisedNew, changeToken, expiresAt);
    this.logger.log(`Email change requested userId=${userId}`);
    return { oldEmail: user.email, newEmail: normalisedNew, changeToken };
  }

  /** Confirm an email-change token: validate + unexpired → promote pendingEmail. */
  async confirmEmailChange(token: string): Promise<void> {
    const user = await this.users.findByEmailChangeToken(token);
    if (
      !user ||
      !user.emailChangeTokenExpiresAt ||
      user.emailChangeTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundException('Invalid or expired token');
    }
    await this.users.applyEmailChange(user.id);
    this.logger.log(`Email change confirmed userId=${user.id}`);
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
