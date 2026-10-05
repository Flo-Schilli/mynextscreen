import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { LanguageService } from '../i18n/language.service';
import { AppLang } from '../i18n/i18n.constants';

/**
 * Compact two-state language toggle (DE / EN) for the topbar and settings.
 * Switching is reactive — {@link LanguageService} persists the choice and
 * re-renders translated views. Presentational only; logic lives in the service.
 */
@Component({
  selector: 'app-language-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  template: `
    <div
      *transloco="let t"
      class="inline-flex items-center rounded-lg border border-border-strong bg-surface p-0.5"
      role="group"
      [attr.aria-label]="t('shell.language.label')"
    >
      @for (lang of language.available; track lang) {
        <button
          type="button"
          class="px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors duration-[120ms]"
          [class.bg-accent]="language.lang() === lang"
          [class.text-on-accent]="language.lang() === lang"
          [class.text-muted]="language.lang() !== lang"
          [class.hover:text-text]="language.lang() !== lang"
          [attr.aria-pressed]="language.lang() === lang"
          [attr.aria-label]="t('shell.language.' + lang)"
          (click)="select(lang)"
        >
          {{ t('shell.language.short.' + lang) }}
        </button>
      }
    </div>
  `,
})
export class LanguageSwitcher {
  readonly language = inject(LanguageService);

  select(lang: AppLang): void {
    this.language.setLang(lang);
  }
}
