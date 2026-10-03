import {
  Component,
  ElementRef,
  input,
  output,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .modal:focus {
      outline: none;
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
