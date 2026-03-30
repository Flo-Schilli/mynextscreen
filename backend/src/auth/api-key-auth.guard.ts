import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import { Screen } from '../screen/screen.entity';
import { verifyApiKey } from '../screen/api-key.util';

export interface ScreenAuthenticatedRequest extends Request {
  screenId: string;
  organisationId: string;
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isScreenAuth = this.reflector.getAllAndOverride<boolean>(
      IS_SCREEN_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
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
  }): string | null {
    const authorization = request.headers['authorization'];
    if (!authorization) {
      return null;
    }
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }
    return token;
  }

  private async findScreenByApiKey(apiKey: string): Promise<Screen | null> {
    const screens = await this.screenRepository.find({
      select: ['id', 'organisationId', 'apiKeyHash'],
    });

    for (const screen of screens) {
      const match = await verifyApiKey(apiKey, screen.apiKeyHash);
      if (match) {
        return screen;
      }
    }

    return null;
  }
}
