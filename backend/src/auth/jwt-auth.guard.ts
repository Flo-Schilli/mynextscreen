import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import { ACCESS_COOKIE } from './cookies';
import { TokenService } from './token.service';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Validates the internal access-token JWT carried in the httpOnly `access_token`
 * cookie. Public and screen-authenticated routes short-circuit (screens use the
 * separate ApiKeyAuthGuard). Replaces the former Hanko JWKS validation.
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

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.tokens.verifyAccessToken(token);
      request.user = {
        userId: payload.sub,
        email: payload.email,
        isSuperAdmin: payload.isSuperAdmin,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractToken(request: Request): string | null {
    const cookies = request.cookies as Record<string, string> | undefined;
    const token = cookies?.[ACCESS_COOKIE];
    return typeof token === 'string' && token.length > 0 ? token : null;
  }
}
