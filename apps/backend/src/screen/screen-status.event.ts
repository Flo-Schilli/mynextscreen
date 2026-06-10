export class ScreenStatusEvent {
  constructor(
    public readonly screenId: string,
    public readonly organisationId: string,
    public readonly isOnline: boolean,
  ) {}
}

export const SCREEN_STATUS_CHANGED = 'screen.status.changed';
