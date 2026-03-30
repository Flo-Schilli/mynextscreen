import { Component, inject, OnInit } from '@angular/core';
import { ConnectionService } from './connection/connection.service';
import { ConnectionDialogComponent } from './connection/connection-dialog';
import { DisconnectOverlayComponent } from './connection/disconnect-overlay';

@Component({
  selector: 'app-root',
  imports: [ConnectionDialogComponent, DisconnectOverlayComponent],
  template: `
    @if (!connectionService.connected()) {
      <app-connection-dialog />
    } @else {
      <app-disconnect-overlay />
      <div
        class="flex h-screen w-screen items-center justify-center bg-black text-white"
      >
        <p class="text-text-muted text-lg">
          Connected to screen {{ connectionService.screenId() }}
        </p>
      </div>
    }
  `,
  styles: [`:host { display: block; width: 100vw; height: 100vh; }`],
})
export class App implements OnInit {
  readonly connectionService = inject(ConnectionService);

  async ngOnInit(): Promise<void> {
    await this.connectionService.tryAutoConnect();
  }
}
