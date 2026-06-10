import { ScreenState } from './screen-state.model';
import { ScreenEvent } from './screen-event.model';

export interface ScreenProtocolAdapter {
  renderState(state: ScreenState): unknown;
  renderEvent(event: ScreenEvent): unknown;
}
