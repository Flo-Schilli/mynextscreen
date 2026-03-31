import { ScreenEventType } from './screen-event-type.enum';
export declare class ScreenEvent {
    readonly type: ScreenEventType;
    readonly payload: Record<string, unknown>;
    constructor(type: ScreenEventType, payload: Record<string, unknown>);
}
