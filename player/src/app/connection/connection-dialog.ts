import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectionService } from './connection.service';

@Component({
  selector: 'app-connection-dialog',
  imports: [FormsModule],
  template: `
    <div class="overlay">
      <div class="card">
        <div class="header">
          <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
            </svg>
          </div>
          <h1 class="title">Connect to Server</h1>
          <p class="subtitle">Enter your server URL and screen API key.</p>
        </div>

        <form (ngSubmit)="onConnect()" class="form">
          <div class="field">
            <label for="serverUrl">Server URL</label>
            <input
              id="serverUrl"
              type="text"
              [(ngModel)]="serverUrl"
              name="serverUrl"
              placeholder="http://localhost:3000"
              autocomplete="url"
            />
          </div>

          <div class="field">
            <label for="apiKey">Screen API Key</label>
            <input
              id="apiKey"
              type="password"
              [(ngModel)]="apiKey"
              name="apiKey"
              placeholder="Enter your screen API key"
              autocomplete="off"
            />
          </div>

          @if (connectionService.error()) {
            <div class="error">
              {{ connectionService.error() }}
            </div>
          }

          <button
            type="submit"
            [disabled]="!canConnect() || connectionService.connecting()"
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
      background: rgba(0, 0, 0, 0.92);
    }

    .card {
      width: 100%;
      max-width: 380px;
      margin: 0 16px;
      padding: 36px 32px 32px;
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%);
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
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
      border-radius: 12px;
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
      margin-bottom: 16px;
    }

    .title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #f1f5f9;
    }

    .subtitle {
      margin: 6px 0 0;
      font-size: 14px;
      color: #64748b;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .field input {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      color: #f1f5f9;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      outline: none;
      transition: border-color 0.2s, background 0.2s;
      box-sizing: border-box;
      font-family: inherit;
    }

    .field input::placeholder {
      color: #475569;
    }

    .field input:focus {
      border-color: #3b82f6;
      background: rgba(255,255,255,0.08);
    }

    .error {
      padding: 10px 14px;
      font-size: 14px;
      color: #f87171;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
    }

    button[type="submit"] {
      width: 100%;
      padding: 11px 16px;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      color: #fff;
      background: #3b82f6;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25);
    }

    button[type="submit"]:hover:not(:disabled) {
      background: #2563eb;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.35);
    }

    button[type="submit"]:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
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
