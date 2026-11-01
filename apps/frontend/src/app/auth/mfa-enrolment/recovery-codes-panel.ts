import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../shared/toast/toast.service';
import { BtnComponent, CopyButtonComponent, IconComponent } from '../../ui';

export const RECOVERY_CODES_FILENAME = 'mynextscreen-recovery-codes.txt';

/** Plain-text body of the downloadable recovery-codes file. */
export function recoveryCodesText(codes: readonly string[], heading: string): string {
  return [heading, '', ...codes, ''].join('\n');
}

/**
 * Shows freshly issued recovery codes once, with copy / `.txt` download and the
 * mandatory "I saved them" checkbox. Holds no state of its own: the codes come
 * in, the acknowledgement goes out.
 */
@Component({
  selector: 'app-recovery-codes-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BtnComponent, CopyButtonComponent, IconComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <p class="mb-3 text-[13.5px] text-muted">{{ t('auth.mfa.codes.intro') }}</p>
      <div
        class="relative mb-3 rounded-[12px] border border-border bg-surface-2 p-4"
        data-testid="recovery-codes"
      >
        <div class="absolute right-2 top-2">
          <mns-copy-button
            [text]="plainText()"
            [label]="t('auth.mfa.codes.copy')"
            (copied)="onCopied()"
            (copyFailed)="onCopyFailed()"
          />
        </div>
        <ul class="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[14px] tracking-wide">
          @for (code of codes(); track code) {
            <li>{{ code }}</li>
          }
        </ul>
      </div>
      <div class="mb-4 flex flex-wrap gap-2">
        <mns-btn variant="outline" size="sm" icon="Download" (mnsClick)="download()">
          {{ t('auth.mfa.codes.download') }}
        </mns-btn>
      </div>
      <p class="mb-4 flex items-start gap-2 text-[12.5px] text-muted">
        <mns-icon name="Alert" [size]="15" class="mt-px flex-shrink-0 text-warn" />
        {{ t('auth.mfa.codes.warning') }}
      </p>
      <label class="flex cursor-pointer items-start gap-2.5 text-[13.5px] font-medium">
        <input
          type="checkbox"
          class="saved-checkbox mt-0.5 h-4 w-4 accent-[var(--accent)]"
          [checked]="acknowledged()"
          (change)="onAcknowledge($event)"
        />
        {{ t('auth.mfa.codes.saved') }}
      </label>
    </ng-container>
  `,
})
export class RecoveryCodesPanelComponent {
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly codes = input.required<readonly string[]>();
  readonly acknowledged = input<boolean>(false);
  readonly acknowledgedChange = output<boolean>();

  protected readonly plainText = computed(() =>
    recoveryCodesText(this.codes(), this.transloco.translate('auth.mfa.codes.fileHeading')),
  );

  protected onAcknowledge(event: Event): void {
    this.acknowledgedChange.emit((event.target as HTMLInputElement).checked);
  }

  protected onCopied(): void {
    this.toast.success(this.transloco.translate('auth.mfa.codes.copied'));
  }

  protected onCopyFailed(): void {
    this.toast.error(this.transloco.translate('auth.mfa.codes.copyFailed'));
  }

  /**
   * Hands the codes to the browser as a file. The object URL is revoked on the
   * next task: revoking it synchronously after `click()` can abort the
   * download in some browsers.
   */
  protected download(): void {
    const blob = new Blob([this.plainText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = RECOVERY_CODES_FILENAME;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
