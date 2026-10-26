export const PLAYLIST_UPDATED = 'playlist.updated';

export class PlaylistUpdatedEvent {
  constructor(
    public readonly playlistId: string,
    public readonly organisationId: string,
  ) {}
}

/** Asks the rule engine to resolve a dynamic playlist now, e.g. a variant a schedule rule just created. */
export const PLAYLIST_RESOLVE_REQUESTED = 'playlist.resolve-requested';

export class PlaylistResolveRequestedEvent {
  constructor(public readonly playlistId: string) {}
}

/** The rule of a dynamic playlist changed; whatever is derived from it must follow. */
export const PLAYLIST_RULE_CHANGED = 'playlist.rule-changed';

export class PlaylistRuleChangedEvent {
  constructor(
    public readonly playlistId: string,
    public readonly organisationId: string,
  ) {}
}
