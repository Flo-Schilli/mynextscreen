import { Component, DestroyRef, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectionService } from './connection.service';

const POLL_INTERVAL_MS = 3_000;

@Component({
  selector: 'app-connection-dialog',
  imports: [FormsModule],
  template: `
    <div class="overlay">
      <div class="card">
        <div class="header">
          <div class="icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z"
              />
            </svg>
          </div>
          <h1 class="title">Pair this screen</h1>
          <p class="subtitle">Enter this code in your dashboard → Add a screen.</p>
        </div>

        @if (connectionService.error()) {
          <div class="error">
            {{ connectionService.error() }}
          </div>
        }

        @if (groupedCode()) {
          <div class="code" aria-label="Pairing code" data-testid="pairing-code">
            {{ groupedCode() }}
          </div>

          <div class="waiting">
            <span class="spinner" aria-hidden="true"></span>
            <span>Waiting to be paired…</span>
          </div>
        } @else {
          <div class="waiting">
            <span class="spinner" aria-hidden="true"></span>
            <span>Requesting a code…</span>
          </div>
        }

        @if (connectionService.error()) {
          <button type="button" class="retry" (click)="restart()" data-testid="retry-pairing">
            Get a new code
          </button>
        }

        <button
          type="button"
          class="advanced-toggle"
          (click)="showAdvanced.set(!showAdvanced())"
          data-testid="advanced-toggle"
        >
          {{ showAdvanced() ? 'Hide' : 'Advanced' }}
        </button>

        @if (showAdvanced()) {
          <div class="field">
            <label for="serverUrl">Server URL</label>
            <input
              id="serverUrl"
              type="text"
              [(ngModel)]="serverUrl"
              name="serverUrl"
              [placeholder]="serverUrl || 'http://localhost:3000'"
              autocomplete="url"
            />
            <button type="button" class="retry" (click)="restart()" data-testid="apply-server-url">
              Apply &amp; get a new code
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .overlay {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgb(0 0 0 / 0.92);
    }

    .card {
      width: 100%;
      max-width: 420px;
      margin: 0 16px;
      padding: 36px 32px 32px;
      border-radius: var(--radius-lg);
      background: linear-gradient(180deg, var(--border-strong) 0%, rgb(255 255 255 / 0.025) 100%);
      border: 1px solid var(--border);
      box-shadow:
        0 25px 60px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05);
      animation: enter 0.35s ease-out;
    }

    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 28px;
    }

    .icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      background: var(--info-dim);
      color: var(--color-info);
      margin-bottom: 16px;
    }

    .title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--text);
    }

    .subtitle {
      margin: 6px 0 0;
      font-size: 14px;
      color: var(--text-muted);
    }

    .code {
      font-family: var(--font-mono);
      font-size: 56px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-align: center;
      color: var(--text);
      margin: 8px 0 20px;
      user-select: all;
    }

    .waiting {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid var(--track);
      border-top-color: var(--color-info);
      animation: spin 0.8s linear infinite;
    }

    .error {
      padding: 10px 14px;
      font-size: 14px;
      color: var(--color-offline);
      background: var(--offline-dim);
      border: 1px solid rgb(239 71 87 / 0.2);
      border-radius: var(--radius-sm);
      margin-bottom: 16px;
      text-align: center;
    }

    .retry {
      display: block;
      margin: 12px auto 0;
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      color: #fff;
      background: var(--color-info);
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .retry:hover {
      background: #2563eb;
    }

    .advanced-toggle {
      display: block;
      margin: 18px auto 0;
      padding: 4px 8px;
      font-size: 12px;
      font-family: inherit;
      color: var(--text-faint);
      background: none;
      border: none;
      cursor: pointer;
      text-decoration: underline;
    }

    .advanced-toggle:hover {
      color: var(--text-muted);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 16px;
    }

    .field label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-faint);
    }

    .field input {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      color: var(--text);
      background: var(--hover);
      border: 1px solid var(--border);
      border-radius: 10px;
      outline: none;
      transition:
        border-color 0.2s,
        background 0.2s;
      box-sizing: border-box;
      font-family: inherit;
    }

    .field input::placeholder {
      color: var(--text-faint);
    }

    .field input:focus {
      border-color: var(--color-info);
      background: rgb(255 255 255 / 0.08);
    }

    @keyframes enter {
      from {
        opacity: 0;
        transform: scale(0.96) translateY(8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `,
})
export class ConnectionDialogComponent implements OnInit {
  readonly connectionService = inject(ConnectionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly connected = output<void>();

  serverUrl = this.getDefaultServerUrl();
  readonly showAdvanced = signal(false);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly groupedCode = computed(() => {
    const code = this.connectionService.pairingCode();
    if (code.length === 6) {
      return `${code.slice(0, 3)} ${code.slice(3)}`;
    }
    return code;
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.stopPolling());
    void this.beginPairing();
  }

  /** Re-request a code (after expiry or an edited server URL). */
  restart(): void {
    void this.beginPairing();
  }

  private async beginPairing(): Promise<void> {
    this.stopPolling();

    const url = this.serverUrl.trim();
    if (!url) return;

    try {
      await this.connectionService.startPairing(url);
    } catch {
      return; // error signal already set by the service
    }

    this.startPolling(url);
  }

  private startPolling(serverUrl: string): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => void this.poll(serverUrl), POLL_INTERVAL_MS);
  }

  private async poll(serverUrl: string): Promise<void> {
    const result = await this.connectionService.pollPairing(serverUrl);

    if (result === 'claimed') {
      this.stopPolling();
      this.connected.emit();
      return;
    }

    if (result === 'expired') {
      this.stopPolling();
      void this.beginPairing();
    }
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private getDefaultServerUrl(): string {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // Derive API domain: replace first subdomain (e.g. "player.example.com" → "api.example.com")
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      parts[0] = 'api';
      return `https://${parts.join('.')}`;
    }
    return '';
  }
}
