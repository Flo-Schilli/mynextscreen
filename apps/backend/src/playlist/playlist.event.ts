export const PLAYLIST_UPDATED = 'playlist.updated';

export class PlaylistUpdatedEvent {
  constructor(
    public readonly playlistId: string,
    public readonly organisationId: string,
  ) {}
}
