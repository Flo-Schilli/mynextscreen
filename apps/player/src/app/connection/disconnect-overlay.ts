import { Component, inject } from '@angular/core';
import { ConnectionService } from './connection.service';

@Component({
  selector: 'app-disconnect-overlay',
  template: `
    <div class="fixed right-4 top-4 z-40">
      <button
        (click)="onDisconnect()"
        class="rounded border border-border bg-surface-2/80 px-3 py-1.5 text-xs text-muted backdrop-blur transition-colors hover:border-red-500/50 hover:text-red-400"
      >
        Disconnect
      </button>
    </div>
  `,
})
export class DisconnectOverlayComponent {
  private readonly connectionService = inject(ConnectionService);

  onDisconnect(): void {
    this.connectionService.disconnect();
  }
}
