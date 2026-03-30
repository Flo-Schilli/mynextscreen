import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectionService } from './connection.service';

@Component({
  selector: 'app-connection-dialog',
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div
        class="w-full max-w-md rounded-lg border border-border bg-bg-secondary p-8"
      >
        <h1 class="mb-2 text-2xl font-semibold text-text-primary">
          Connect to Server
        </h1>
        <p class="mb-6 text-sm text-text-muted">
          Enter your signage server URL and screen API key to start the player.
        </p>

        <form (ngSubmit)="onConnect()" class="space-y-4">
          <div>
            <label
              for="serverUrl"
              class="mb-1 block text-sm font-medium text-text-secondary"
              >Server URL</label
            >
            <input
              id="serverUrl"
              type="text"
              [(ngModel)]="serverUrl"
              name="serverUrl"
              placeholder="http://localhost:3000"
              class="w-full rounded border border-border bg-bg-tertiary px-3 py-2 text-text-primary placeholder-text-muted outline-none focus:border-accent"
              autocomplete="url"
            />
          </div>

          <div>
            <label
              for="apiKey"
              class="mb-1 block text-sm font-medium text-text-secondary"
              >Screen API Key</label
            >
            <input
              id="apiKey"
              type="password"
              [(ngModel)]="apiKey"
              name="apiKey"
              placeholder="Enter your screen API key"
              class="w-full rounded border border-border bg-bg-tertiary px-3 py-2 text-text-primary placeholder-text-muted outline-none focus:border-accent"
              autocomplete="off"
            />
          </div>

          @if (connectionService.error()) {
            <div
              class="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              {{ connectionService.error() }}
            </div>
          }

          <button
            type="submit"
            [disabled]="!canConnect() || connectionService.connecting()"
            class="w-full rounded bg-accent px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            @if (connectionService.connecting()) {
              Connecting...
            } @else {
              Connect
            }
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ConnectionDialogComponent {
  readonly connectionService = inject(ConnectionService);
  readonly connected = output<void>();

  serverUrl = '';
  apiKey = '';

  canConnect(): boolean {
    return this.serverUrl.trim().length > 0 && this.apiKey.trim().length > 0;
  }

  async onConnect(): Promise<void> {
    if (!this.canConnect()) return;

    const success = await this.connectionService.connect(
      this.serverUrl.trim(),
      this.apiKey.trim(),
    );

    if (success) {
      this.connected.emit();
    }
  }
}
