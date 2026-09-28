import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import { IS_SIGNED_MEDIA_KEY } from './signed-media.decorator';
import { MediaUrlSigner, SCREEN_PARAM, SIGNATURE_PARAM } from '../common/media-url-signer.service';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { eq, isNull } from 'drizzle-orm';
import { screens } from '../db/schema';
import { sha256hex, verifyApiKey } from '../screen/api-key.util';

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
    private readonly mediaUrlSigner: MediaUrlSigner,
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

    // A signed URL is the preferred credential on media routes: it carries no
    // secret, is scoped to one screen and one path, and expires on its own.
    if (this.allowsSignedMediaUrl(context) && (await this.authenticateBySignature(request))) {
      return true;
    }

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

  private allowsSignedMediaUrl(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_SIGNED_MEDIA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  /**
   * Verifies a signed media URL and, on success, resolves the screen's current
   * organisation from the database rather than from the URL — so a screen moved
   * between organisations does not keep the old scope for the life of the
   * signature.
   */
  private async authenticateBySignature(request: {
    path?: string;
    query?: Record<string, string>;
    screenId?: string;
    organisationId?: string;
  }): Promise<boolean> {
    const signature = request.query?.[SIGNATURE_PARAM];
    const screenId = request.query?.[SCREEN_PARAM];
    if (!signature || !screenId || !request.path) {
      return false;
    }
    if (!this.mediaUrlSigner.verify(screenId, request.path, signature)) {
      return false;
    }

    const [screen] = await this.db
      .select({ id: screens.id, organisationId: screens.organisationId })
      .from(screens)
      .where(eq(screens.id, screenId))
      .limit(1);
    if (!screen) {
      return false;
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

  /**
   * Indexed lookup by SHA-256 fingerprint, with bcrypt run on the single row it
   * finds. Every screen request used to bcrypt-compare against *every* screen
   * row, which is both a scaling defect (cost grows with the fleet) and a cheap
   * CPU-exhaustion vector: an unauthenticated request with a bogus key forced
   * one bcrypt per screen.
   *
   * Screens whose key predates the fingerprint column still need the scan —
   * SHA-256 cannot be recovered from a bcrypt hash — but it is limited to those
   * rows, and each one is upgraded the first time it authenticates, because the
   * plaintext key is available exactly then.
   */
  private async findScreenByApiKey(apiKey: string): Promise<ScreenApiKeyRow | null> {
    const fingerprint = sha256hex(apiKey);

    const [candidate] = await this.db
      .select({
        id: screens.id,
        organisationId: screens.organisationId,
        apiKeyHash: screens.apiKeyHash,
      })
      .from(screens)
      .where(eq(screens.apiKeyFingerprint, fingerprint))
      .limit(1);

    if (candidate) {
      return (await verifyApiKey(apiKey, candidate.apiKeyHash)) ? candidate : null;
    }

    return this.findLegacyScreenByApiKey(apiKey, fingerprint);
  }

  private async findLegacyScreenByApiKey(
    apiKey: string,
    fingerprint: string,
  ): Promise<ScreenApiKeyRow | null> {
    const rows = await this.db
      .select({
        id: screens.id,
        organisationId: screens.organisationId,
        apiKeyHash: screens.apiKeyHash,
      })
      .from(screens)
      .where(isNull(screens.apiKeyFingerprint));

    for (const screen of rows) {
      if (await verifyApiKey(apiKey, screen.apiKeyHash)) {
        await this.db
          .update(screens)
          .set({ apiKeyFingerprint: fingerprint })
          .where(eq(screens.id, screen.id));
        return screen;
      }
    }

    return null;
  }
}
