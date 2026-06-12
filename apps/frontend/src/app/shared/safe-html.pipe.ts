import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Marks an app-owned, static HTML string as trusted so Angular renders it via
 * `[innerHTML]` instead of stripping it during sanitization. Needed for the
 * inline `<svg>` nav icons: Angular's HTML sanitizer removes `<svg>` from
 * `[innerHTML]`, so without this the icons disappear.
 *
 * SAFETY: only ever apply this to developer-authored, constant markup (e.g. the
 * icon strings in the nav config) — never to user input or any value derived
 * from it, as it bypasses XSS sanitization.
 */
@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}
