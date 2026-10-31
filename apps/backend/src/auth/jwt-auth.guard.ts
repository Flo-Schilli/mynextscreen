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
import { ALLOW_WITHOUT_MFA_KEY } from './mfa/allow-without-mfa.decorator';
import { MFA_ENROLMENT_REQUIRED } from './mfa/mfa.constants';

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

    let user: AuthenticatedUser;
    try {
      const payload = await this.tokens.verifyAccessToken(token);
      user = {
        userId: payload.sub,
        email: payload.email,
        isSuperAdmin: payload.isSuperAdmin,
        mfa: payload.mfa,
      };
    } catch {
      throw new UnauthorizedException('Invalid authentication token');
    }
    request.user = user;

    // Super-admins see every organisation, so their sessions must always be
    // MFA-confirmed. A session without it (password-only login, or a token
    // minted before this release) stays valid but only reaches the routes
    // marked @AllowWithoutMfa — i.e. the enrolment wizard.
    if (user.isSuperAdmin && !user.mfa && !this.allowsWithoutMfa(context)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: MFA_ENROLMENT_REQUIRED,
        message: 'Multi-factor authentication must be set up before continuing',
      });
    }
    return true;
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
