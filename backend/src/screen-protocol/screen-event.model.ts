import { ScreenEventType } from './screen-event-type.enum';

export class ScreenEvent {
  constructor(
    public readonly type: ScreenEventType,
    public readonly payload: Record<string, unknown>,
  ) {}
}
