import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route that a screen may also reach with a signed media URL instead of
 * its API key — the browser cannot put a header on an `<img>`/`<video>` request.
 * Used together with `@ScreenAuth()`, which stays the fallback while players are
 * being migrated.
 */
export const IS_SIGNED_MEDIA_KEY = 'isSignedMedia';
export const SignedMediaUrl = () => SetMetadata(IS_SIGNED_MEDIA_KEY, true);
