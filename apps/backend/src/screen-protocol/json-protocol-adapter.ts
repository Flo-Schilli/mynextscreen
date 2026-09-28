import { Injectable } from '@nestjs/common';
import { MediaUrlSigner } from '../common/media-url-signer.service';
import { ScreenProtocolAdapter } from './screen-protocol-adapter.interface';
import { ScreenState, PlaylistItem } from './screen-state.model';
import { ScreenEvent } from './screen-event.model';

@Injectable()
export class JsonProtocolAdapter implements ScreenProtocolAdapter {
  constructor(private readonly mediaUrlSigner: MediaUrlSigner) {}

  renderState(state: ScreenState): Record<string, unknown> {
    return {
      screen: state.screen,
      epoch: state.epoch,
      currentPlaylist: state.currentPlaylist
        ? {
            id: state.currentPlaylist.id,
            name: state.currentPlaylist.name,
            items: state.currentPlaylist.items.map((item) =>
              this.renderPlaylistItem(item, state.screen.organisationId, state.screen.id),
            ),
          }
        : null,
      schedule: state.scheduleEntries.map((entry) => ({
        id: entry.id,
        playlistId: entry.playlistId,
        startTime: entry.startTime,
        endTime: entry.endTime,
        recurrenceRule: entry.recurrenceRule ?? null,
      })),
      fallbackPlaylist: state.fallbackPlaylist
        ? {
            id: state.fallbackPlaylist.id,
            name: state.fallbackPlaylist.name,
            items: state.fallbackPlaylist.items.map((item) =>
              this.renderPlaylistItem(item, state.screen.organisationId, state.screen.id),
            ),
          }
        : null,
      liveStream: state.activeLiveStream
        ? {
            id: state.activeLiveStream.id,
            streamUrl: state.activeLiveStream.streamUrl,
            startedAt: state.activeLiveStream.startedAt,
          }
        : null,
      group: state.group
        ? {
            id: state.group.id,
            name: state.group.name,
            mode: state.group.mode,
            gridRows: state.group.gridRows,
            gridColumns: state.group.gridColumns,
          }
        : null,
    };
  }

  renderEvent(event: ScreenEvent): Record<string, unknown> {
    return {
      type: event.type,
      timestamp: new Date().toISOString(),
      data: event.payload,
    };
  }

  private renderPlaylistItem(
    item: PlaylistItem,
    organisationId: string,
    screenId: string,
  ): Record<string, unknown> {
    const path = item.contentUrl || `/api/media/${organisationId}/${item.contentId}`;
    // Signed here, where the URL leaves the server: the player uses it verbatim
    // and never has to attach a credential of its own.
    const url = this.mediaUrlSigner.sign(screenId, path);
    return {
      url,
      duration: item.duration,
      type: item.type,
      transition: item.transition,
      transitionDurationMs: item.transitionDurationMs,
    };
  }
}
