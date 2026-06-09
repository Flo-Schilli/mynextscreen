import { Component, input, output } from '@angular/core';
import { ScreenGroupScreen } from './screen-group.model';

/**
 * Mirror-mode assigned-screen list with add/remove controls. Presentational:
 * the parent owns the screen list and performs the assign/remove HTTP work.
 */
@Component({
  selector: 'app-screen-group-mirror-list',
  standalone: true,
  template: `
    <div class="mirror-layout">
      <div class="mirror-section">
        <div class="mirror-header">
          <h2 class="section-title">Assigned Screens ({{ screens().length }})</h2>
          <button class="btn btn-primary btn-small" (click)="addScreen.emit()">+ Add Screen</button>
        </div>
        @if (screens().length === 0) {
          <div class="mirror-empty">
            <p>No screens assigned to this group yet.</p>
            <button class="btn btn-primary" (click)="addScreen.emit()">Add Screen</button>
          </div>
        } @else {
          <div class="mirror-list">
            @for (screen of screens(); track screen.id) {
              <div class="mirror-screen">
                <div class="mirror-screen-info">
                  <span class="mirror-screen-name">{{ screen.name }}</span>
                  <span class="mirror-screen-location">{{ screen.location }}</span>
                </div>
                <button
                  class="btn btn-small btn-danger"
                  (click)="removeScreen.emit(screen.id)"
                  [disabled]="operationInProgress()"
                >
                  Remove
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 1rem;
    }

    /* Mirror Mode */
    .mirror-layout {
      max-width: 40rem;
    }
    .mirror-section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
    }
    .mirror-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .mirror-header .section-title {
      margin: 0;
    }
    .mirror-empty {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--color-text-muted);
    }
    .mirror-empty p {
      margin: 0 0 1rem;
      font-size: 0.875rem;
    }
    .mirror-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .mirror-screen {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
    }
    .mirror-screen-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .mirror-screen-name {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .mirror-screen-location {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
  `,
})
export class ScreenGroupMirrorList {
  readonly screens = input.required<ScreenGroupScreen[]>();
  readonly operationInProgress = input.required<boolean>();

  readonly addScreen = output<void>();
  readonly removeScreen = output<string>();
}
