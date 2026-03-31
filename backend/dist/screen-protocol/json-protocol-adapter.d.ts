import { ScreenProtocolAdapter } from './screen-protocol-adapter.interface';
import { ScreenState } from './screen-state.model';
import { ScreenEvent } from './screen-event.model';
export declare class JsonProtocolAdapter implements ScreenProtocolAdapter {
    renderState(state: ScreenState): Record<string, unknown>;
    renderEvent(event: ScreenEvent): Record<string, unknown>;
    private renderPlaylistItem;
}
