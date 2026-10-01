import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_AGENT_AUTH_KEY } from './agent-auth.decorator';
import { TokenService } from './token.service';

export interface AgentAuthenticatedRequest extends Request {
  agentId: string;
  organisationId: string;
}

/**
 * Authenticates a site agent by its session access token.
 *
 * Runs after {@link ApiKeyAuthGuard} and before {@link RolesGuard}, and is a
 * no-op on every route that is not marked `@AgentAuth()`. The organisation is
 * read from the token, never from a header or the body: an agent must not be
 * able to name the tenant it acts for.
 */
@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAgentAuth = this.reflector.getAllAndOverride<boolean>(IS_AGENT_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isAgentAuth) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AgentAuthenticatedRequest & { headers: Record<string, string> }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing agent session token');
    }

    try {
      const payload = await this.tokens.verifyAgentAccessToken(token);
      request.agentId = payload.sub;
      request.organisationId = payload.org;
      return true;
    } catch {
      // Deliberately one message for expired, malformed and wrong-audience:
      // the agent's only reaction to any of them is to refresh and retry.
      throw new UnauthorizedException('Invalid agent session');
    }
  }

  private extractToken(request: { headers: Record<string, string> }): string | null {
    const authorization = request.headers['authorization'];
    if (!authorization) {
      return null;
    }
    const [scheme, token] = authorization.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
