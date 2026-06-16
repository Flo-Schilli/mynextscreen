import { Component, inject, OnInit } from '@angular/core';
import { ConnectionService } from './connection/connection.service';
import { ConnectionDialogComponent } from './connection/connection-dialog';
import { DisconnectOverlayComponent } from './connection/disconnect-overlay';
import { PlaybackComponent } from './playback/playback.component';
import { PlayerService } from './player/player.service';

@Component({
  selector: 'app-root',
  imports: [ConnectionDialogComponent, DisconnectOverlayComponent, PlaybackComponent],
  template: `
    @if (!connectionService.connected()) {
      <app-connection-dialog />
    } @else {
      @if (playerService.showDisconnectButton()) {
        <app-disconnect-overlay />
      }
      <app-playback />
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100vw;
        height: 100vh;
      }
    `,
  ],
})
export class App implements OnInit {
  readonly connectionService = inject(ConnectionService);
  readonly playerService = inject(PlayerService);

  async ngOnInit(): Promise<void> {
    await this.connectionService.tryAutoConnect();
  }
}
