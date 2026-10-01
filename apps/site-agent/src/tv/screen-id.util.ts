import { join } from 'node:path';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Builds a per-screen file path, refusing anything that is not a UUID.
 *
 * Screen ids arrive in the configuration the server sends. The server generates
 * UUIDs, but the agent holds credentials for a whole venue and writes with its
 * own privileges — so a screen id of `../../something` has to be impossible
 * here rather than merely unlikely upstream.
 */
export function screenFilePath(dir: string, screenId: string, extension: string): string {
  if (!UUID.test(screenId)) {
    throw new Error(`Refusing to use "${screenId}" as a file name: not a screen id`);
  }
  return join(dir, `${screenId}${extension}`);
}
