import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { NoStore } from '../../common/no-store.decorator';
import { AuthService } from '../auth.service';
import type { SessionTokens } from '../auth.types';
import { setAccessCookie, setRefreshCookie } from '../cookies';
import type { AuthenticatedRequest } from '../jwt-auth.guard';
import { UserScoped } from '../user-scoped.decorator';
import { AllowWithoutMfa } from './allow-without-mfa.decorator';
import { RecoveryCodesRegenerateDto, TotpCodeDto, TotpDisableDto, TotpSetupDto } from './dto';
import { MfaService, type MfaStatus, type TotpSetup } from './mfa.service';

export interface RecoveryCodesResponse {
  recoveryCodes: string[];
}

/**
 * Self-service MFA management under `/api/auth/mfa`. Reachable without an
 * MFA-confirmed session on purpose — this is where a user who must enrol
 * does so. Everything that changes the factor asks for proof again (password
 * and/or a current code), so a stolen session alone cannot take it over.
 */
@Controller('auth/mfa')
@UserScoped()
@AllowWithoutMfa()
export class MfaController {
  constructor(
    private readonly mfa: MfaService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  async status(@Req() req: AuthenticatedRequest): Promise<MfaStatus> {
    return this.mfa.getStatus(req.user.userId);
  }

  @Post('totp/setup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @NoStore()
  async setup(@Req() req: AuthenticatedRequest, @Body() dto: TotpSetupDto): Promise<TotpSetup> {
    return this.mfa.startEnrolment(req.user.userId, dto.currentPassword, dto.code);
  }

  /**
   * Persist the factor, revoke every session (including ones an attacker may
   * hold) and hand this device a new MFA-confirmed one.
   */
  @Post('totp/confirm')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @NoStore()
  async confirm(
    @Req() req: AuthenticatedRequest,
    @Body() dto: TotpCodeDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RecoveryCodesResponse> {
    const { user, recoveryCodes } = await this.mfa.confirmEnrolment(req.user.userId, dto.code);
    this.writeSession(res, await this.auth.replaceAllSessions(user, { mfa: true }));
    return { recoveryCodes };
  }

  /** 409 while MFA is mandatory for the user; otherwise sessions start over without it. */
  @Post('totp/disable')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async disable(
    @Req() req: AuthenticatedRequest,
    @Body() dto: TotpDisableDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const user = await this.mfa.disable(req.user.userId, dto.currentPassword, dto.code);
    this.writeSession(res, await this.auth.replaceAllSessions(user, { mfa: false }));
  }

  /** Needs the current password and a valid code, like every other factor change. */
  @Post('recovery-codes/regenerate')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @NoStore()
  async regenerate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RecoveryCodesRegenerateDto,
  ): Promise<RecoveryCodesResponse> {
    return {
      recoveryCodes: await this.mfa.regenerateRecoveryCodes(
        req.user.userId,
        dto.currentPassword,
        dto.code,
      ),
    };
  }

  private writeSession(res: Response, session: SessionTokens): void {
    setAccessCookie(res, this.config, session.accessToken.token, session.accessToken.expiresAt);
    setRefreshCookie(res, this.config, session.refreshToken.token, session.refreshToken.expiresAt);
  }
}
