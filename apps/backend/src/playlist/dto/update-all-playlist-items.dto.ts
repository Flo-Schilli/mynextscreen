import { UpdatePlaylistItemDto } from './update-playlist-item.dto';

/**
 * Patch applied to every item of a playlist. Same fields and bounds as a
 * single-item patch; `durationSeconds` only reaches image items, since a
 * video always plays its own length.
 */
export class UpdateAllPlaylistItemsDto extends UpdatePlaylistItemDto {}
