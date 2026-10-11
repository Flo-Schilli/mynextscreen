export const SCREEN_GROUP_MEMBERSHIP_CHANGED = 'screen-group.membership-changed';

/**
 * A screen joined a group, left one, or moved to a different cell of the same
 * split wall. Listeners that cache a screen's group for the lifetime of its SSE
 * connection rely on this: assigning a screen does not reconnect it.
 */
export class ScreenGroupMembershipChangedEvent {
  constructor(
    public readonly screenId: string,
    public readonly organisationId: string,
    public readonly previousGroupId: string | null,
    public readonly groupId: string | null,
  ) {}
}
