import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivateLiveStreamRequest, LiveStream } from './live-stream.model';
import { Screen } from '../screens/screen.model';
import { ScreenGroup } from '../screen-groups/screen-group.model';

/**
 * Activate-live-stream modal. Lets the operator target individual screens or a
 * screen group, owns its own selection state, validates a target is chosen, and
 * emits a resolved {@link ActivateLiveStreamRequest} only when valid. The parent
 * performs the HTTP request and feeds `activating`/`error` back in.
 */
@Component({
  selector: 'app-live-stream-activate-modal',
  standalone: true,
  imports: [FormsModule],
  styles: [
    `
      .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: rgba(4, 6, 11, 0.55);
        backdrop-filter: blur(6px);
        animation: mns-fade-in 0.18s ease both;
      }
      @media (prefers-reduced-motion: reduce) {
        .modal-overlay {
          animation: none;
        }
      }
      .modal {
        width: 100%;
        max-width: 520px;
        background: var(--surface);
        border: 1px solid var(--border-strong);
        border-radius: var(--r-xl, 16px);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        animation: mns-fade-up 0.28s cubic-bezier(0.22, 0.61, 0.36, 1) both;
      }
      .modal-wide {
        max-width: 560px;
      }
      @media (prefers-reduced-motion: reduce) {
        .modal {
          animation: none;
        }
      }
      h2 {
        margin: 0;
        padding: 1.25rem 1.5rem;
        font-size: 1.0625rem;
        font-weight: 700;
        color: var(--text);
        border-bottom: 1px solid var(--border);
      }
      p {
        margin: 0;
        padding: 0.75rem 1.5rem 0;
        font-size: 0.875rem;
        color: var(--text-muted);
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem 1.5rem 0;
      }
      .form-label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--text-muted);
      }
      label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--text-muted);
      }
      select {
        padding: 0.625rem 0.875rem;
        background: var(--surface-2);
        border: 1px solid var(--border-strong);
        border-radius: var(--r-md, 8px);
        color: var(--text);
        font-size: 0.875rem;
        font-family: inherit;
        outline: none;
      }
      select:focus {
        border-color: var(--accent);
      }
      .radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .radio-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text);
        cursor: pointer;
      }
      .radio-label input[type='radio'] {
        accent-color: var(--accent);
        width: 1rem;
        height: 1rem;
      }
      .checkbox-list {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        max-height: 200px;
        overflow-y: auto;
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text);
        cursor: pointer;
      }
      .checkbox-label input[type='checkbox'] {
        accent-color: var(--accent);
        width: 1rem;
        height: 1rem;
      }
      .text-muted {
        font-size: 0.8125rem;
        color: var(--text-faint);
      }
      .error {
        font-size: 0.8125rem;
        color: var(--offline);
        padding: 0.625rem 0.875rem;
        margin: 0.75rem 1.5rem 0;
        border-radius: var(--r-md, 8px);
        border: 1px solid color-mix(in srgb, var(--offline) 30%, var(--border));
        background: var(--offline-dim);
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.625rem;
        padding: 1.25rem 1.5rem;
        border-top: 1px solid var(--border);
        margin-top: 1.25rem;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5625rem 1.125rem;
        border-radius: var(--r-lg, 10px);
        border: none;
        font-size: 0.875rem;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        transition: opacity 0.15s;
      }
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-primary {
        background: var(--accent);
        color: #fff;
      }
      .btn-primary:hover:not(:disabled) {
        opacity: 0.88;
      }
      .btn-secondary {
        background: var(--surface-2);
        color: var(--text);
        border: 1px solid var(--border-strong);
      }
      .btn-secondary:hover:not(:disabled) {
        background: var(--surface-3);
      }
      @keyframes mns-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes mns-fade-up {
        from {
          opacity: 0;
          transform: translateY(14px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Activate Live Stream"
      tabindex="0"
      (click)="dismiss.emit()"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="modal modal-wide"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h2>Activate "{{ stream().name }}"</h2>
        <p>Choose target screens or a screen group to stream to.</p>

        <div class="form-group">
          <span class="form-label">Target type</span>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="targetType" value="screens" [(ngModel)]="targetType" />
              Individual Screens
            </label>
            <label class="radio-label">
              <input type="radio" name="targetType" value="group" [(ngModel)]="targetType" />
              Screen Group
            </label>
          </div>
        </div>

        @if (targetType === 'screens') {
          <div class="form-group">
            <span class="form-label">Select screens</span>
            @if (screens().length === 0) {
              <p class="text-muted">No screens available.</p>
            } @else {
              <div class="checkbox-list">
                @for (screen of screens(); track screen.id) {
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="selectedScreenIds.has(screen.id)"
                      (change)="toggleScreen(screen.id)"
                    />
                    {{ screen.name }}
                    @if (screen.location) {
                      <span class="text-muted">({{ screen.location }})</span>
                    }
                  </label>
                }
              </div>
            }
          </div>
        } @else {
          <div class="form-group">
            <label for="activateGroupId">Select screen group</label>
            <select id="activateGroupId" [(ngModel)]="groupId" name="activateGroupId">
              <option value="">-- Select a group --</option>
              @for (group of screenGroups(); track group.id) {
                <option [value]="group.id">
                  {{ group.name }} ({{ group.screens.length }} screens)
                </option>
              }
            </select>
          </div>
        }

        @if (localError() || error()) {
          <p class="error">{{ localError() || error() }}</p>
        }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button class="btn btn-primary" (click)="onSubmit()" [disabled]="activating()">
            {{ activating() ? 'Activating...' : 'Activate' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LiveStreamActivateModal {
  readonly stream = input.required<LiveStream>();
  readonly screens = input.required<Screen[]>();
  readonly screenGroups = input.required<ScreenGroup[]>();
  readonly activating = input.required<boolean>();
  readonly error = input.required<string>();

  readonly activate = output<ActivateLiveStreamRequest>();
  readonly dismiss = output<void>();

  protected targetType: 'screens' | 'group' = 'screens';
  protected readonly selectedScreenIds = new Set<string>();
  protected groupId = '';
  protected readonly localError = signal('');

  toggleScreen(screenId: string): void {
    if (this.selectedScreenIds.has(screenId)) {
      this.selectedScreenIds.delete(screenId);
    } else {
      this.selectedScreenIds.add(screenId);
    }
  }

  onSubmit(): void {
    const dto: ActivateLiveStreamRequest = {};

    if (this.targetType === 'screens') {
      if (this.selectedScreenIds.size === 0) {
        this.localError.set('Select at least one screen.');
        return;
      }
      dto.targetScreenIds = Array.from(this.selectedScreenIds);
    } else {
      if (!this.groupId) {
        this.localError.set('Select a screen group.');
        return;
      }
      dto.targetGroupId = this.groupId;
    }

    this.localError.set('');
    this.activate.emit(dto);
  }
}
