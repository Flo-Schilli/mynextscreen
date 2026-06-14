import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../ui/icon.component';
import { ToastService } from './toast.service';

/**
 * Renders the global toast queue as a fixed bottom-right stack.
 * Design: bg-surface border-strong rounded-[13px] shadow-lg, tone-coloured icon.
 * Mounted once at the app root — do not add elsewhere.
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="fixed bottom-6 right-6 z-[2000] flex flex-col gap-2.5 pointer-events-none"
      style="max-width: min(24rem, calc(100vw - 3rem))"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 px-4 py-3 bg-surface border border-border-strong rounded-[13px]"
          style="box-shadow: var(--shadow-lg); animation: fadeUp .22s cubic-bezier(.22,.61,.36,1) both"
          role="status"
        >
          <!-- tone icon -->
          <div
            class="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 mt-px"
            [class.bg-online-dim]="toast.type === 'success'"
            [class.text-online]="toast.type === 'success'"
            [class.bg-offline-dim]="toast.type === 'error'"
            [class.text-offline]="toast.type === 'error'"
            [class.bg-info-dim]="toast.type === 'info'"
            [class.text-info]="toast.type === 'info'"
            aria-hidden="true"
          >
            @switch (toast.type) {
              @case ('success') {
                <mns-icon name="CheckCircle" [size]="15" />
              }
              @case ('error') {
                <mns-icon name="Alert" [size]="15" />
              }
              @default {
                <mns-icon name="Bell" [size]="15" />
              }
            }
          </div>

          <span class="flex-1 text-[13px] leading-snug pt-0.5">{{ toast.message }}</span>

          <button
            type="button"
            class="flex-shrink-0 w-6 h-6 rounded-md grid place-items-center text-muted transition-colors duration-[120ms] hover:bg-hover hover:text-text"
            aria-label="Dismiss"
            (click)="toasts.dismiss(toast.id)"
          >
            <mns-icon name="Plus" [size]="12" style="transform:rotate(45deg)" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  readonly toasts = inject(ToastService);
}
