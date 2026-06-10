import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screens } from '../db/schema';
import { verifyApiKey } from '../screen/api-key.util';

export interface ScreenAuthenticatedRequest extends Request {
  screenId: string;
  organisationId: string;
}

interface ScreenApiKeyRow {
  id: string;
  organisationId: string;
  apiKeyHash: string;
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isScreenAuth = this.reflector.getAllAndOverride<boolean>(IS_SCREEN_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isScreenAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing API key');
    }

    const screen = await this.findScreenByApiKey(token);
    if (!screen) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.screenId = screen.id;
    request.organisationId = screen.organisationId;
    return true;
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

  private async findScreenByApiKey(apiKey: string): Promise<ScreenApiKeyRow | null> {
    const rows = await this.db
      .select({
        id: screens.id,
        organisationId: screens.organisationId,
        apiKeyHash: screens.apiKeyHash,
      })
      .from(screens);

    for (const screen of rows) {
      const match = await verifyApiKey(apiKey, screen.apiKeyHash);
      if (match) {
        return screen;
      }
    }

    return null;
  }
}
