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
