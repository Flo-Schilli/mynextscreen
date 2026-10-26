import { isNull, type SQL } from 'drizzle-orm';
import { playlists } from '../db/schema';

/**
 * Leaves out the genre variants event schedule rules keep of a playlist: the
 * rule owns them, so the organisation neither lists, picks nor edits them.
 */
export function isOwnPlaylist(): SQL {
  return isNull(playlists.managedByRuleId);
}
