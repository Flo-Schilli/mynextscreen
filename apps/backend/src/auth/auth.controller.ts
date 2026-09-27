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
import { REFRESH_COOKIE, clearAuthCookies, setAccessCookie, setRefreshCookie } from './cookies';
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
import type { AuthenticatedUserView } from './auth.types';

const DEFAULT_SIGNUP_STORAGE_BYTES = 5 * 1024 * 1024 * 1024;

interface AuthSuccessResponse {
  user: AuthenticatedUserView;
}

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
  async register(@Body() dto: RegisterDto): Promise<void> {
    if (!this.isSignupEnabled()) {
      throw new ForbiddenException('Self-signup is disabled');
    }
    const { user, verificationToken } = await this.auth.register({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      organisationName: dto.organisationName,
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
  ): Promise<AuthSuccessResponse> {
    const { user, accessToken, refreshToken } = await this.auth.verifyEmail(dto.token);
    setAccessCookie(res, this.config, accessToken.token, accessToken.expiresAt);
    setRefreshCookie(res, this.config, refreshToken.token, refreshToken.expiresAt);
    this.events.emit(
      AUDIT_EMAIL_VERIFIED,
      new AuditAuthEvent(user.id, null, { email: user.email }),
    );
    return {
      user: { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin },
    };
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
    const { user, accessToken, refreshToken } = await this.auth.setupFirstSuperAdmin(
      dto.email,
      dto.password,
      dto.name,
    );
    setAccessCookie(res, this.config, accessToken.token, accessToken.expiresAt);
    setRefreshCookie(res, this.config, refreshToken.token, refreshToken.expiresAt);
    this.events.emit(
      AUDIT_SUPER_ADMIN_SETUP,
      new AuditAuthEvent(user.id, null, { email: user.email }),
    );
    return {
      user: { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin },
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessResponse> {
    const { user, accessToken, refreshToken } = await this.auth.login(dto.email, dto.password);
    setAccessCookie(res, this.config, accessToken.token, accessToken.expiresAt);
    setRefreshCookie(res, this.config, refreshToken.token, refreshToken.expiresAt);
    return {
      user: { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin },
    };
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
      setAccessCookie(res, this.config, result.accessToken.token, result.accessToken.expiresAt);
      setRefreshCookie(res, this.config, result.refreshToken.token, result.refreshToken.expiresAt);
      return { refreshed: true };
    } catch (error) {
      // On any refresh failure (unknown/reuse) clear cookies so the client logs out.
      clearAuthCookies(res, this.config);
      throw error;
    }
  }

  @Public()
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
    await this.auth.setPassword(dto.token, dto.newPassword);
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
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
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
    const cookies = req.cookies as Record<string, string> | undefined;
    const raw = cookies?.[REFRESH_COOKIE];
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }
}
