import {
  Component,
  ElementRef,
  input,
  output,
  AfterViewInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-bulk-confirm-dialog',
  standalone: true,
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
      (click)="onCancel()"
      (keydown.escape)="onCancel()"
    >
      <div
        class="modal"
        role="document"
        #modalContent
        tabindex="-1"
        (click)="$event.stopPropagation()"
        (keydown)="onKeydown($event)"
      >
        <h2>{{ title() }}</h2>
        <p>{{ message() }}</p>
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="onCancel()">Cancel</button>
          <button class="btn btn-danger" #confirmBtn (click)="onConfirm()">
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      min-width: 24rem;
      max-width: 36rem;
      box-shadow: 0 8px 24px var(--color-shadow);
    }
    .modal:focus {
      outline: none;
    }
    .modal h2 {
      margin: 0 0 1.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }
    .modal p {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      line-height: 1.5;
    }
    .form-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }
  `,
})
export class BulkConfirmDialogComponent implements AfterViewInit, OnDestroy {
  title = input.required<string>();
  message = input.required<string>();
  confirmLabel = input<string>('Delete');
  itemCount = input.required<number>();

  confirmed = output<boolean>();

  @ViewChild('modalContent') modalContent!: ElementRef<HTMLElement>;

  private previouslyFocused: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.modalContent.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus();
  }

  onConfirm(): void {
    this.confirmed.emit(true);
  }

  onCancel(): void {
    this.confirmed.emit(false);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    const modal = this.modalContent.nativeElement;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /**
   * Static helper to open the dialog as a promise.
   * Usage: set a flag to show the dialog, wire the (confirmed) output to a resolver.
   */
  static createPromise(): {
    promise: Promise<boolean>;
    resolve: (value: boolean) => void;
  } {
    let resolve: (value: boolean) => void;
    const promise = new Promise<boolean>((r) => {
      resolve = r;
    });
    return { promise, resolve: resolve! };
  }
}
