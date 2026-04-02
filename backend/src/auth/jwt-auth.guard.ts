import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private hankoApiUrl: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.hankoApiUrl = this.configService.get<string>('HANKO_API_URL', '');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isScreenAuth = this.reflector.getAllAndOverride<boolean>(
      IS_SCREEN_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isScreenAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const jwks = this.getJwks();
      const { payload } = await jwtVerify(token, jwks, {
        issuer: this.hankoApiUrl,
      });
      request.user = this.extractUser(payload);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractToken(request: {
    headers: Record<string, string>;
    query?: Record<string, string>;
  }): string | null {
    const authorization = request.headers['authorization'];
    if (authorization) {
      const [scheme, token] = authorization.split(' ');
      if (scheme === 'Bearer' && token) {
        return token;
      }
    }
    // Fallback: token query param (for media URLs in img/video src)
    const queryToken = request.query?.['token'];
    if (queryToken) {
      return queryToken;
    }
    return null;
  }

  private getJwks(): ReturnType<typeof createRemoteJWKSet> {
    if (!this.jwks) {
      if (!this.hankoApiUrl) {
        throw new Error('HANKO_API_URL is not configured');
      }
      const jwksUrl = new URL('/.well-known/jwks.json', this.hankoApiUrl);
      this.jwks = createRemoteJWKSet(jwksUrl);
    }
    return this.jwks;
  }

  private extractUser(payload: JWTPayload): AuthenticatedUser {
    const rawEmail = payload.email;
    let email = '';
    if (typeof rawEmail === 'string') {
      email = rawEmail;
    } else if (rawEmail && typeof rawEmail === 'object' && 'address' in rawEmail) {
      email = (rawEmail as { address: string }).address;
    }

    return {
      userId: payload.sub ?? '',
      email,
    };
  }
}
