/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { useDialogStack } from './dialog-stack';
import { IconComponent, IconName } from './icon.component';

/**
 * Full-screen overlay backdrop. Close on backdrop click or Esc key.
 * Use together with `<mns-modal>` or place content directly in the default slot.
 *
 * @example
 * @if (showOverlay()) {
 *   <mns-overlay (closed)="showOverlay.set(false)">
 *     <mns-modal title="Confirm" icon="Alert" (closed)="showOverlay.set(false)">
 *       …
 *     </mns-modal>
 *   </mns-overlay>
 * }
 */
@Component({
  selector: 'mns-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-40 grid place-items-center p-4"
      style="background: rgba(4,6,11,.55); backdrop-filter: blur(6px)"
      role="dialog"
      aria-modal="true"
      tabindex="0"
      (click)="onBackdropClick($event)"
      (keydown.escape)="onBackdropEscape($event)"
    >
      <ng-content />
    </div>
  `,
  host: {
    style: 'display:contents',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class OverlayComponent {
  readonly closed = output<void>();

  private readonly isInnermost = useDialogStack();

  /** Only the innermost open dialog answers Escape. */
  onEscape(): void {
    if (this.isInnermost()) {
      this.closed.emit();
    }
  }

  /**
   * Escape pressed while the backdrop itself holds focus. Handled here so the
   * document listener does not see the same keypress a second time.
   */
  onBackdropEscape(event: Event): void {
    event.stopPropagation();
    this.onEscape();
  }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.closed.emit();
    }
  }
}

/**
 * Modal dialog panel: icon tile + title + close button + body slot.
 * Mount inside `<mns-overlay>`.
 *
 * @example
 * <mns-modal title="Delete Screen" icon="Trash" (closed)="close()">
 *   <p>Are you sure?</p>
 *   <div slot="footer">…buttons…</div>
 * </mns-modal>
 */
@Component({
  selector: 'mns-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-border-strong bg-surface"
      [style.maxWidth.px]="widthPx()"
      style="box-shadow: var(--shadow-lg); animation: fadeUp .3s cubic-bezier(.22,.61,.36,1) both"
    >
      <!-- header -->
      <div class="flex flex-shrink-0 items-center gap-3 px-6 pt-5 pb-4 border-b border-border">
        @if (icon()) {
          <div
            class="w-9 h-9 rounded-[9px] bg-accent-soft text-accent grid place-items-center flex-shrink-0"
          >
            <mns-icon [name]="icon()!" [size]="18" />
          </div>
        }
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-bold tracking-[-0.01em] truncate">{{ title() }}</h2>
          @if (sub()) {
            <p class="text-[13px] text-muted truncate">{{ sub() }}</p>
          }
        </div>
        <button
          type="button"
          class="w-8 h-8 rounded-lg grid place-items-center text-muted transition-colors duration-[120ms] hover:bg-hover hover:text-text"
          aria-label="Close"
          (click)="closed.emit()"
        >
          <mns-icon name="X" [size]="16" />
        </button>
      </div>

      <!-- body -->
      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <ng-content />
      </div>

      <!-- footer slot -->
      <ng-content select="[slot=footer]" />
    </div>
  `,
  host: { style: 'display:contents' },
})
export class ModalComponent {
  readonly title = input.required<string>();
  /** Optional muted subtitle rendered under the title. */
  readonly sub = input<string | undefined>(undefined);
  readonly icon = input<IconName | undefined>(undefined);
  /** Max width of the modal panel in px. Defaults to the standard 520. */
  readonly widthPx = input<number>(520);
  readonly closed = output<void>();
}
