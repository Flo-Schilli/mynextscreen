import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  AUTH_PASSWORD_RESET_REQUESTED,
  AuthPasswordResetRequestedEvent,
} from '../audit-log/audit.events';
import { AuthService } from './auth.service';
import { REFRESH_COOKIE, clearAuthCookies, setAccessCookie, setRefreshCookie } from './cookies';
import { AuthenticatedRequest } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { SetupDto } from './dto/setup.dto';
import type { AuthenticatedUserView } from './auth.types';

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
  async setupStatus(): Promise<{ setupNeeded: boolean }> {
    const hasUser = await this.users.hasAnyUser();
    return { setupNeeded: !hasUser };
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
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      return;
    }
    const token = await this.auth.createPasswordResetToken(user);
    const memberships = await this.users.getMemberships(user.id);
    const organisationId = memberships[0]?.organisationId;
    if (organisationId) {
      this.events.emit(
        AUTH_PASSWORD_RESET_REQUESTED,
        new AuthPasswordResetRequestedEvent(organisationId, user.email, token),
      );
    }
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }

  @Get('me')
  getMe(@Req() req: AuthenticatedRequest): AuthenticatedUserView {
    return {
      userId: req.user.userId,
      email: req.user.email,
      isSuperAdmin: req.user.isSuperAdmin,
    };
  }

  private readRefreshCookie(req: Request): string | null {
    const cookies = req.cookies as Record<string, string> | undefined;
    const raw = cookies?.[REFRESH_COOKIE];
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }
}
