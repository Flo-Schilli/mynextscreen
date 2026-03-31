export declare class ScreenStatusEvent {
    readonly screenId: string;
    readonly organisationId: string;
    readonly isOnline: boolean;
    constructor(screenId: string, organisationId: string, isOnline: boolean);
}
export declare const SCREEN_STATUS_CHANGED = "screen.status.changed";
