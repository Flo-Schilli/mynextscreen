import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Screen } from './screen.model';

/**
 * Read-only screen detail card: status, location, resolution, heartbeat and
 * registration date, plus the API-key management section. Emits intents
 * (`edit`, `dismiss`, `regenerate`); the parent owns the HTTP work and feeds
 * the `regenerating` flag back in.
 */
@Component({
  selector: 'app-screen-detail',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="detail-card">
      <div class="detail-header">
        <h2>{{ screen().name }}</h2>
        <div class="detail-actions">
          <button class="btn btn-secondary" (click)="edit.emit()">Edit</button>
          <button class="btn btn-secondary" (click)="dismiss.emit()">Close</button>
        </div>
      </div>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Status</span>
          <span
            class="status-badge"
            [class.online]="screen().isOnline"
            [class.offline]="!screen().isOnline"
          >
            {{ screen().isOnline ? 'Online' : 'Offline' }}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Location</span>
          <span>{{ screen().location }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Resolution</span>
          <span>{{ screen().resolution }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Last Heartbeat</span>
          <span>{{
            screen().lastHeartbeat ? (screen().lastHeartbeat | date: 'medium') : 'Never'
          }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Registered</span>
          <span>{{ screen().createdAt | date: 'mediumDate' }}</span>
        </div>
      </div>
      <div class="api-key-section">
        <h3>API Key Management</h3>
        <p class="text-muted">
          Regenerate the API key if it has been compromised. The current key will be invalidated
          immediately.
        </p>
        <button class="btn btn-danger" (click)="regenerate.emit()" [disabled]="regenerating()">
          Regenerate API Key
        </button>
      </div>
    </div>
  `,
  styles: `
    /* Detail Card */
    .detail-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 40rem;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .detail-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .detail-actions {
      display: flex;
      gap: 0.5rem;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
    }
    .status-badge.online {
      background: #22c55e20;
      color: #22c55e;
    }
    .status-badge.offline {
      background: #ef444420;
      color: #ef4444;
    }

    .api-key-section {
      border-top: 1px solid var(--color-border);
      padding-top: 1.5rem;
    }
    .api-key-section h3 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      font-weight: 600;
    }
    .text-muted {
      color: var(--color-text-secondary);
      font-size: 0.8125rem;
      margin: 0 0 1rem;
      line-height: 1.5;
    }
  `,
})
export class ScreenDetail {
  readonly screen = input.required<Screen>();
  readonly regenerating = input.required<boolean>();

  readonly edit = output<void>();
  readonly dismiss = output<void>();
  readonly regenerate = output<void>();
}
