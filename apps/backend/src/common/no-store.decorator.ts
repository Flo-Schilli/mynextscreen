import { applyDecorators, Header } from '@nestjs/common';

/**
 * For responses that carry a secret (API keys, session/refresh tokens, setup
 * codes, devmode passphrases): no browser, proxy or CDN may keep a copy.
 */
export function NoStore(): MethodDecorator {
  return applyDecorators(Header('Cache-Control', 'no-store'), Header('Pragma', 'no-cache'));
}
