import { formatDate, formatNumber } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from './language.service';

/**
 * Date and number formatting that follows a language switch.
 *
 * Angular's own `DatePipe`/`DecimalPipe` read `LOCALE_ID`, which is a DI token:
 * the injector resolves it once and the pipes cache the string in their
 * constructor. Switching the language at runtime therefore leaves every
 * formatted date and number in the language the tab was loaded in, while the
 * surrounding text does switch. These pipes read {@link LanguageService.locale}
 * on each call instead, which is the same approach `content-format.service` and
 * `schedule-calendar.service` already take for the formatting they do in code.
 *
 * Impure, because a pure pipe is only re-run when its inputs change and the
 * locale is not one of them. The cost of that is paid back by the one-entry
 * memo: a change-detection pass that changes nothing compares four values and
 * returns the previous string.
 */

interface DateMemo {
  value: Date | string | number | null | undefined;
  format: string;
  locale: string;
  result: string | null;
}

@Pipe({ name: 'localeDate', standalone: true, pure: false })
export class LocaleDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);
  private memo: DateMemo | null = null;

  transform(
    value: Date | string | number | null | undefined,
    format = 'mediumDate',
  ): string | null {
    const locale = this.language.locale();
    const memo = this.memo;
    if (memo && memo.value === value && memo.format === format && memo.locale === locale) {
      return memo.result;
    }

    const result = value === null || value === undefined ? null : formatDate(value, format, locale);
    this.memo = { value, format, locale, result };
    return result;
  }
}

interface NumberMemo {
  value: number | string | null | undefined;
  digitsInfo: string | undefined;
  locale: string;
  result: string | null;
}

@Pipe({ name: 'localeNumber', standalone: true, pure: false })
export class LocaleNumberPipe implements PipeTransform {
  private readonly language = inject(LanguageService);
  private memo: NumberMemo | null = null;

  transform(value: number | string | null | undefined, digitsInfo?: string): string | null {
    const locale = this.language.locale();
    const memo = this.memo;
    if (memo && memo.value === value && memo.digitsInfo === digitsInfo && memo.locale === locale) {
      return memo.result;
    }

    const result =
      value === null || value === undefined
        ? null
        : formatNumber(Number(value), locale, digitsInfo);
    this.memo = { value, digitsInfo, locale, result };
    return result;
  }
}
