import {
  Component,
  inject,
  input,
  signal,
  Signal,
} from '@angular/core';
import { SelectionService } from './selection.service';

export interface BulkAction {
  label: string;
  icon?: string;
  variant: 'default' | 'danger';
  handler: () => void | Promise<void>;
  disabled?: Signal<boolean>;
}

@Component({
  selector: 'app-bulk-action-toolbar',
  standalone: true,
  template: `
    @if (selectionService.hasSelection()) {
      <div class="bulk-toolbar" role="toolbar" aria-label="Bulk actions">
        <span class="selection-count">
          {{ selectionService.count() }} item(s) selected
        </span>
        <button
          class="clear-btn"
          (click)="selectionService.clearAll()"
          [disabled]="loading()"
          aria-label="Clear selection"
        >
          Clear selection
        </button>
        <div class="toolbar-actions">
          @for (action of actions(); track action.label) {
            <button
              class="btn"
              [class.btn-danger]="action.variant === 'danger'"
              [class.btn-default]="action.variant === 'default'"
              [disabled]="loading() || action.disabled?.()"
              (click)="executeAction(action)"
            >
              @if (loading()) {
                <span class="spinner" aria-hidden="true"></span>
              }
              {{ action.label }}
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .bulk-toolbar {
      position: sticky;
      bottom: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--color-bg-secondary);
      border-top: 1px solid var(--color-border);
      border-radius: 0.5rem 0.5rem 0 0;
      box-shadow: 0 -2px 8px var(--color-shadow);
      z-index: 10;
      animation: slideUp 0.2s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .selection-count {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-primary);
      white-space: nowrap;
    }

    .clear-btn {
      background: none;
      border: none;
      color: var(--color-accent);
      cursor: pointer;
      font-size: 0.8125rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      white-space: nowrap;
    }

    .clear-btn:hover:not(:disabled) {
      text-decoration: underline;
    }

    .clear-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.15s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-default {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .btn-default:hover:not(:disabled) {
      background: var(--color-border);
    }

    .btn-danger {
      background: #991b1b;
      color: #fecaca;
    }

    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
    }

    .spinner {
      display: inline-block;
      width: 0.875rem;
      height: 0.875rem;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class BulkActionToolbarComponent {
  readonly actions = input.required<BulkAction[]>();

  readonly selectionService = inject(SelectionService);
  readonly loading = signal(false);

  async executeAction(action: BulkAction): Promise<void> {
    this.loading.set(true);
    try {
      await action.handler();
      this.selectionService.clearAll();
    } catch {
      // Action failed — keep selection intact so the user can retry
    } finally {
      this.loading.set(false);
    }
  }
}
