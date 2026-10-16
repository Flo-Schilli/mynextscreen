import { ConflictException } from '@nestjs/common';
import type { Playlist } from '../db/schema';
import { PlaylistKind } from './playlist-kind.enum';

/**
 * Manual item edits on a dynamic playlist would be overwritten by its next
 * resolve, so they are refused with 409.
 */
export function assertStaticPlaylist(playlist: Pick<Playlist, 'id' | 'kind'>): void {
  if (playlist.kind === PlaylistKind.Dynamic) {
    throw new ConflictException(
      `Playlist "${playlist.id}" is dynamic; its items follow its rule and cannot be edited`,
    );
  }
}
