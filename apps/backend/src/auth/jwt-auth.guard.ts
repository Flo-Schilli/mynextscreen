import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_AGENT_AUTH_KEY } from './agent-auth.decorator';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import { ACCESS_COOKIE } from './cookies';
import { TokenService } from './token.service';
import type { AccessTokenPayload } from './token.types';
import { ALLOW_WITHOUT_MFA_KEY } from './mfa/allow-without-mfa.decorator';
import { MFA_ENROLMENT_REQUIRED } from './mfa/mfa.constants';
import { MfaService, isMfaMandatory } from './mfa/mfa.service';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  /** This session was confirmed with a second factor (access-token claim). */
  mfa: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Validates the internal access-token JWT carried in the httpOnly `access_token`
 * cookie. Public, screen- and agent-authenticated routes short-circuit (those
 * two carry their own token kinds and are handled by ApiKeyAuthGuard and
 * AgentAuthGuard). Replaces the former Hanko JWKS validation.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly mfa: MfaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isScreenAuth = this.reflector.getAllAndOverride<boolean>(IS_SCREEN_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isScreenAuth) {
      return true;
    }

    const isAgentAuth = this.reflector.getAllAndOverride<boolean>(IS_AGENT_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isAgentAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.tokens.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid authentication token');
    }
    // Outside the try: a Redis outage is a 5xx, not a "bad token".
    if (await this.tokens.isAccessTokenRevoked(payload.sub, payload.iat)) {
      throw new UnauthorizedException('Session revoked');
    }
    const user: AuthenticatedUser = {
      userId: payload.sub,
      email: payload.email,
      isSuperAdmin: payload.isSuperAdmin,
      mfa: payload.mfa,
    };
    request.user = user;

    if (!user.mfa && !this.allowsWithoutMfa(context)) {
      await this.assertMfaOptional(user);
    }
    return true;
  }

  /**
   * MFA is bound to the user: mandatory for super-admins and for members of
   * any org with `requireMfa` — then for every route, in every org. A session
   * without it (password-only login, or a token minted before the policy
   * applied) stays valid but only reaches the routes marked @AllowWithoutMfa,
   * i.e. the enrolment wizard. Evaluated live, so switching `requireMfa` on
   * takes effect on the next request; MFA-confirmed sessions never get here.
   */
  private async assertMfaOptional(user: AuthenticatedUser): Promise<void> {
    const requiredBy = await this.mfa.requiredBy({
      id: user.userId,
      isSuperAdmin: user.isSuperAdmin,
    });
    if (isMfaMandatory(requiredBy)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: MFA_ENROLMENT_REQUIRED,
        message: 'Multi-factor authentication must be set up before continuing',
        requiredBy,
      });
    }
  }

  private allowsWithoutMfa(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(ALLOW_WITHOUT_MFA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private extractToken(request: Request): string | null {
    const cookies = request.cookies as Record<string, string> | undefined;
    const token = cookies?.[ACCESS_COOKIE];
    return typeof token === 'string' && token.length > 0 ? token : null;
  }
}
