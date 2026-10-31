import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { UserService } from '../user/user.service';
import {
  AUTH_EMAIL_CHANGE_REQUESTED,
  AUTH_EMAIL_VERIFICATION_REQUESTED,
  AUTH_PASSWORD_CHANGED,
  AUTH_PASSWORD_RESET_REQUESTED,
  AuthEmailChangeRequestedEvent,
  AuthEmailVerificationRequestedEvent,
  AuthPasswordChangedEvent,
  AuthPasswordResetRequestedEvent,
  AUDIT_USER_REGISTERED,
  AUDIT_EMAIL_VERIFIED,
  AUDIT_AUTH_EMAIL_CHANGE_REQUESTED,
  AUDIT_AUTH_EMAIL_CHANGED,
  AUDIT_AUTH_PASSWORD_RESET_REQUESTED,
  AUDIT_AUTH_PASSWORD_CHANGED,
  AUDIT_SUPER_ADMIN_SETUP,
  AuditAuthEvent,
} from '../audit-log/audit.events';
import { AuthService } from './auth.service';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  clearMfaChallengeCookie,
  setAccessCookie,
  setMfaChallengeCookie,
  setRefreshCookie,
} from './cookies';
import { AllowWithoutMfa } from './mfa/allow-without-mfa.decorator';
import { MFA_CHALLENGE_COOKIE, MFA_METHODS } from './mfa/mfa.constants';
import { LoginMfaDto } from './mfa/dto/login-mfa.dto';
import { AuthenticatedRequest } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { UserScoped } from './user-scoped.decorator';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { SetupDto } from './dto/setup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import type {
  AuthSuccessResponse,
  AuthenticatedUserView,
  FirstFactorOutcome,
  LoginResponse,
  LoginResult,
  SessionTokens,
} from './auth.types';

const DEFAULT_SIGNUP_STORAGE_BYTES = 5 * 1024 * 1024 * 1024;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly users: UserService,
    private readonly events: EventEmitter2,
  ) {}

  @Public()
  @Get('setup-status')
  async setupStatus(): Promise<{ setupNeeded: boolean; signupEnabled: boolean }> {
    const hasUser = await this.users.hasAnyUser();
    return { setupNeeded: !hasUser, signupEnabled: this.isSignupEnabled() };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  /**
   * Not enumeration-safe, deliberately: a duplicate email answers 409 while a
   * fresh one answers 204, so this route tells an anonymous caller whether an
   * address has an account — unlike forgot-password, which always answers 204.
   * Hiding it would mean accepting the signup, sending "you already have an
   * account" by email and leaving the caller unable to distinguish a typo from
   * a duplicate. The rate limit below is what bounds the enumeration; revisit
   * this if signup is ever opened to an untrusted audience at scale.
   */
  async register(@Body() dto: RegisterDto): Promise<void> {
    if (!this.isSignupEnabled()) {
      throw new ForbiddenException('Self-signup is disabled');
    }
    const { user, verificationToken } = await this.auth.register({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      organisationName: dto.organisationName,
      timeZone: dto.timeZone,
      storageOriginalLimitBytes: this.config.get<number>(
        'SIGNUP_DEFAULT_STORAGE_ORIGINAL_BYTES',
        DEFAULT_SIGNUP_STORAGE_BYTES,
      ),
      storageTranscodedLimitBytes: this.config.get<number>(
        'SIGNUP_DEFAULT_STORAGE_TRANSCODED_BYTES',
        DEFAULT_SIGNUP_STORAGE_BYTES,
      ),
    });
    this.events.emit(
      AUTH_EMAIL_VERIFICATION_REQUESTED,
      new AuthEmailVerificationRequestedEvent(dto.email.toLowerCase(), verificationToken),
    );
    this.events.emit(
      AUDIT_USER_REGISTERED,
      new AuditAuthEvent(user.id, null, {
        email: user.email,
        organisationName: dto.organisationName,
      }),
    );
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const outcome = await this.auth.verifyEmail(dto.token);
    this.events.emit(
      AUDIT_EMAIL_VERIFIED,
      new AuditAuthEvent(outcome.user.id, null, { email: outcome.user.email }),
    );
    return this.respondToFirstFactor(res, outcome);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<void> {
    // Enumeration-safe: always 204. Only unverified accounts get a fresh link.
    const user = await this.users.findByEmail(dto.email);
    if (!user || user.emailVerified) {
      return;
    }
    const token = await this.auth.createEmailVerificationToken(user);
    this.events.emit(
      AUTH_EMAIL_VERIFICATION_REQUESTED,
      new AuthEmailVerificationRequestedEvent(user.email, token),
    );
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  async setup(
    @Body() dto: SetupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessResponse> {
    const result = await this.auth.setupFirstSuperAdmin(dto.email, dto.password, dto.name);
    this.writeSession(res, result);
    this.events.emit(
      AUDIT_SUPER_ADMIN_SETUP,
      new AuditAuthEvent(result.user.id, null, { email: result.user.email }),
    );
    // Super-admin without MFA → mfaEnrolmentRequired: the SPA goes straight
    // into the enrolment wizard, which makes MFA part of the first-run setup.
    return toAuthSuccess(result);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const outcome = await this.auth.login(dto.email, dto.password);
    return this.respondToFirstFactor(res, outcome);
  }

  /**
   * Second login step. The challenge comes from the httpOnly cookie set by
   * step one; a missing or expired one is 401 (the SPA restarts at the
   * password). Tight rate limit on top of the per-challenge and per-user
   * attempt counters in MfaService.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login/mfa')
  @HttpCode(HttpStatus.OK)
  async loginMfa(
    @Body() dto: LoginMfaDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessResponse> {
    const challengeId = this.readCookie(req, MFA_CHALLENGE_COOKIE);
    if (!challengeId) {
      throw new UnauthorizedException('MFA challenge expired — sign in again');
    }
    const result = await this.auth.loginMfa(
      challengeId,
      dto.code !== undefined ? { code: dto.code } : { recoveryCode: dto.recoveryCode },
    );
    clearMfaChallengeCookie(res, this.config);
    this.writeSession(res, result);
    return toAuthSuccess(result);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ refreshed: true }> {
    const raw = this.readRefreshCookie(req);
    if (!raw) {
      throw new UnauthorizedException('Missing refresh token');
    }
    try {
      const result = await this.auth.refresh(raw);
      this.writeSession(res, result);
      return { refreshed: true };
    } catch (error) {
      // On any refresh failure (unknown/reuse) clear cookies so the client logs out.
      clearAuthCookies(res, this.config);
      throw error;
    }
  }

  @Public()
  @AllowWithoutMfa()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const raw = this.readRefreshCookie(req);
    if (raw) {
      await this.auth.logout(raw);
    }
    clearAuthCookies(res, this.config);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('set-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPassword(@Body() dto: SetPasswordDto): Promise<void> {
    await this.auth.setPassword(dto.token, dto.newPassword, dto.name);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    // Enumeration-safe: always 204, regardless of whether the account exists.
    // Unverified accounts are treated identically to unknown ones (silent no-op):
    // otherwise a self-signup could reset their password to flip emailVerified=true
    // (see UserService.setPassword) and bypass the verification-link gate. Invitee
    // activation is unaffected — it issues its own set-password token via
    // MembershipService.addMember, not through this forgot-password path.
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.emailVerified) {
      return;
    }
    const token = await this.auth.createPasswordResetToken(user);
    // Sent via the env-driven platform mailer (no org SMTP needed).
    this.events.emit(
      AUTH_PASSWORD_RESET_REQUESTED,
      new AuthPasswordResetRequestedEvent(user.email, token),
    );
    this.events.emit(
      AUDIT_AUTH_PASSWORD_RESET_REQUESTED,
      new AuditAuthEvent(user.id, null, { email: user.email }),
    );
  }

  @Post('change-password')
  @UserScoped()
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    // changePassword revokes every session, including this one — write the fresh
    // pair back so the acting device stays logged in and only the others drop out.
    const session = await this.auth.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
      { mfa: req.user.mfa },
    );
    this.writeSession(res, session);
    this.events.emit(AUTH_PASSWORD_CHANGED, new AuthPasswordChangedEvent(req.user.email));
    this.events.emit(
      AUDIT_AUTH_PASSWORD_CHANGED,
      new AuditAuthEvent(req.user.userId, null, { email: req.user.email }),
    );
  }

  @Post('change-email')
  @UserScoped()
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeEmail(@Req() req: AuthenticatedRequest, @Body() dto: ChangeEmailDto): Promise<void> {
    const change = await this.auth.changeEmail(req.user.userId, dto.newEmail, dto.currentPassword);
    this.events.emit(
      AUTH_EMAIL_CHANGE_REQUESTED,
      new AuthEmailChangeRequestedEvent(change.oldEmail, change.newEmail, change.changeToken),
    );
    this.events.emit(
      AUDIT_AUTH_EMAIL_CHANGE_REQUESTED,
      new AuditAuthEvent(req.user.userId, null, {
        oldEmail: change.oldEmail,
        newEmail: change.newEmail,
      }),
    );
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('confirm-email-change')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmEmailChange(@Body() dto: ConfirmEmailChangeDto): Promise<void> {
    const change = await this.auth.confirmEmailChange(dto.token);
    this.events.emit(
      AUDIT_AUTH_EMAIL_CHANGED,
      new AuditAuthEvent(change.userId, null, {
        oldEmail: change.oldEmail,
        newEmail: change.newEmail,
      }),
    );
  }

  @Post('delete-account')
  @UserScoped()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.deleteAccount(req.user.userId, dto.currentPassword);
    clearAuthCookies(res, this.config);
  }

  @Get('me')
  @UserScoped()
  @AllowWithoutMfa()
  async getMe(@Req() req: AuthenticatedRequest): Promise<AuthenticatedUserView> {
    // Read from the DB rather than echoing the JWT payload: the access token is
    // long-lived and carries the email/role from issue time, so after an
    // email change it stays stale until the token rotates. Sourcing from the DB
    // makes a page refresh reflect the current address (and super-admin status)
    // immediately, regardless of where the change was confirmed.
    const user = await this.users.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    };
  }

  /** Reads SIGNUP_ENABLED, tolerating both the validated boolean and a raw string. */
  private isSignupEnabled(): boolean {
    const value = this.config.get<boolean | string>('SIGNUP_ENABLED', true);
    return value === true || value === 'true' || value === '1';
  }

  private readRefreshCookie(req: Request): string | null {
    return this.readCookie(req, REFRESH_COOKIE);
  }

  private readCookie(req: Request, name: string): string | null {
    const cookies = req.cookies as Record<string, string> | undefined;
    const raw = cookies?.[name];
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }

  private writeSession(res: Response, session: SessionTokens): void {
    setAccessCookie(res, this.config, session.accessToken.token, session.accessToken.expiresAt);
    setRefreshCookie(res, this.config, session.refreshToken.token, session.refreshToken.expiresAt);
  }

  /** Session → cookies + user view; TOTP user → challenge cookie, no session. */
  private respondToFirstFactor(res: Response, outcome: FirstFactorOutcome): LoginResponse {
    if (outcome.kind === 'mfa-required') {
      setMfaChallengeCookie(res, this.config, outcome.challengeId);
      return { mfaRequired: true, methods: [...MFA_METHODS] };
    }
    this.writeSession(res, outcome);
    return toAuthSuccess(outcome);
  }
}

export function toUserView(user: LoginResult['user']): AuthenticatedUserView {
  return { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin };
}

/** Super-admins must use MFA, so a session without it sends them to enrolment. */
export function toAuthSuccess(result: Pick<LoginResult, 'user' | 'mfa'>): AuthSuccessResponse {
  return {
    user: toUserView(result.user),
    mfaEnrolmentRequired: result.user.isSuperAdmin && !result.mfa,
  };
}
