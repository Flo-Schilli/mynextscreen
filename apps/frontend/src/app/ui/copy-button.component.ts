/* eslint-disable @angular-eslint/component-selector */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { IconComponent } from './icon.component';

/** How long the button shows the check mark after a successful copy. */
const CONFIRM_MS = 2000;

/**
 * Icon button that copies `text` to the clipboard and briefly turns into a
 * check mark. Reports the outcome so the host can toast it: the Clipboard API
 * is refused in plenty of contexts (plain http on a LAN address, iframes), and
 * the host knows best what to tell the user then.
 *
 * @example
 * <mns-copy-button [text]="code" (copied)="toastOk()" (copyFailed)="toastErr()" />
 */
@Component({
  selector: 'mns-copy-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TranslocoDirective],
  template: `
    <button
      *transloco="let t"
      type="button"
      class="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] transition-colors duration-[120ms] hover:bg-hover"
      [class.text-muted]="!done()"
      [class.hover:text-text]="!done()"
      [class.text-online]="done()"
      [attr.aria-label]="label() || t('common.actions.copy')"
      [attr.title]="label() || t('common.actions.copy')"
      (click)="copy()"
    >
      <mns-icon [name]="done() ? 'Check' : 'Copy'" [size]="16" />
    </button>
  `,
})
export class CopyButtonComponent {
  readonly text = input.required<string>();
  /** Accessible name; defaults to the localized "Copy". */
  readonly label = input<string>('');

  readonly copied = output<void>();
  readonly copyFailed = output<void>();

  protected readonly done = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
    } catch {
      this.copyFailed.emit();
      return;
    }
    this.done.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.done.set(false), CONFIRM_MS);
    this.copied.emit();
  }
}
