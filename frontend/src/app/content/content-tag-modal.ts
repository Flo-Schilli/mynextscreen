import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Presentational modal for bulk add/remove tags. Owns nothing but its own view;
 * the comma-separated tag text is two-way bound via {@link model} so the parent
 * stays the source of truth for the value it later parses. Emits confirm/cancel;
 * the parent drives the show flag and the bulk request.
 */
@Component({
  selector: 'app-content-tag-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Manage tags"
      tabindex="0"
      (click)="dismiss.emit()"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="modal"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h2>{{ mode() === 'add' ? 'Add Tags' : 'Remove Tags' }}</h2>
        <div class="form-group">
          <label for="bulkTagInput">Tags (comma-separated)</label>
          <input
            id="bulkTagInput"
            type="text"
            [(ngModel)]="value"
            name="bulkTagInput"
            placeholder="e.g. promo, seasonal"
          />
        </div>
        @if (suggestions().length > 0) {
          <div class="tag-suggestions">
            @for (tag of suggestions(); track tag) {
              <button
                class="tag-chip"
                [class.active]="selectedTags().includes(tag)"
                (click)="toggleTag(tag)"
              >
                {{ tag }}
              </button>
            }
          </div>
        }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button class="btn btn-primary" (click)="confirm.emit()" [disabled]="!value().trim()">
            {{ mode() === 'add' ? 'Add Tags' : 'Remove Tags' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .tag-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-bottom: 1rem;
    }
    .tag-chip {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tag-chip.active {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: #fff;
    }
    .tag-chip:hover:not(.active) {
      border-color: var(--color-text-secondary);
      color: var(--color-text-primary);
    }
  `,
})
export class ContentTagModal {
  readonly mode = input.required<'add' | 'remove'>();
  readonly suggestions = input.required<string[]>();
  readonly value = model.required<string>();
  readonly confirm = output<void>();
  readonly dismiss = output<void>();

  protected selectedTags(): string[] {
    return this.value()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  toggleTag(tag: string): void {
    const tags = this.selectedTags();
    const idx = tags.indexOf(tag);
    if (idx >= 0) {
      tags.splice(idx, 1);
    } else {
      tags.push(tag);
    }
    this.value.set(tags.join(', '));
  }
}
