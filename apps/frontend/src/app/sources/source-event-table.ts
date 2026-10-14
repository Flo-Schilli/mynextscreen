import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { SourceEvent, SourceEventSlide } from './content-source.model';
import { formatLabel } from './source-form-state';
import { ContentService } from '../content/content.service';
import { LanguageService } from '../i18n/language.service';
import { formatIsoDate } from '../i18n/locale-date-input';
import { BadgeComponent } from '../ui';

/**
 * Event pool of one source: date, artist, venue, genres, status and a
 * thumbnail per rendered slide. A slide opens full size in a new tab.
 */
@Component({
  selector: 'app-source-event-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, TranslocoDirective],
  template: `
    <div class="overflow-x-auto" *transloco="let t">
      <table class="w-full min-w-[860px] text-[13px]">
        <thead>
          <tr class="text-left text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
            <th class="py-2 pr-4 font-bold">{{ t('sources.events.date') }}</th>
            <th class="py-2 pr-4 font-bold">{{ t('sources.events.artist') }}</th>
            <th class="py-2 pr-4 font-bold">{{ t('sources.events.venue') }}</th>
            <th class="py-2 pr-4 font-bold">{{ t('sources.events.genres') }}</th>
            <th class="py-2 pr-4 font-bold">{{ t('sources.events.status') }}</th>
            <th class="py-2 font-bold">{{ t('sources.events.slides') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (event of events(); track event.id) {
            <tr
              class="event-row border-t border-border align-top"
              [class.opacity-60]="event.goneAt"
            >
              <td class="py-2.5 pr-4 whitespace-nowrap font-mono">
                {{ dateLabel(event.eventDate) }}
                @if (event.startTime) {
                  <span class="block text-muted">{{ event.startTime }}</span>
                }
              </td>
              <td class="py-2.5 pr-4 font-semibold">
                @if (event.detailUrl) {
                  <a
                    [href]="event.detailUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:underline"
                    >{{ event.title }}</a
                  >
                } @else {
                  {{ event.title }}
                }
              </td>
              <td class="py-2.5 pr-4">
                {{ event.venue }}
                @if (event.city) {
                  <span class="block text-muted">{{ event.city }}</span>
                }
              </td>
              <td class="py-2.5 pr-4 text-muted">{{ event.genres.join(', ') || '—' }}</td>
              <td class="py-2.5 pr-4">
                <div class="flex flex-wrap gap-1">
                  @if (event.cancelled) {
                    <mns-badge tone="offline">{{ t('sources.events.cancelled') }}</mns-badge>
                  }
                  @if (event.soldOut) {
                    <mns-badge tone="warning">{{ t('sources.events.soldOut') }}</mns-badge>
                  }
                  @if (event.goneAt) {
                    <mns-badge tone="neutral">{{ t('sources.events.gone') }}</mns-badge>
                  }
                  @for (label of otherLabels(event); track label) {
                    <mns-badge tone="info">{{ label }}</mns-badge>
                  }
                </div>
              </td>
              <td class="py-2.5">
                <div class="flex flex-wrap gap-1.5">
                  @for (slide of event.slides; track slide.format) {
                    <a
                      [href]="fullUrl(slide)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="slide-thumb block overflow-hidden rounded-[6px] bg-surface-3 border border-border"
                      [class.w-16]="isLandscape(slide)"
                      [class.h-9]="isLandscape(slide)"
                      [class.w-6]="!isLandscape(slide)"
                      [class.h-10]="!isLandscape(slide)"
                      [title]="label(slide)"
                    >
                      <img
                        [src]="thumbUrl(slide)"
                        [alt]="t('sources.events.slideAlt', { format: label(slide) })"
                        class="w-full h-full object-cover"
                        loading="lazy"
                        (error)="onThumbError($event, slide)"
                      />
                    </a>
                  } @empty {
                    <span class="text-muted">{{ t('sources.events.noSlide') }}</span>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  host: { class: 'block' },
})
export class SourceEventTable {
  private readonly contentService = inject(ContentService);
  private readonly language = inject(LanguageService);

  readonly events = input.required<SourceEvent[]>();

  protected dateLabel(iso: string): string {
    return formatIsoDate(iso, this.language.locale()) || iso;
  }

  /** Status labels the cancelled / sold-out / gone badges do not already say. */
  protected otherLabels(event: SourceEvent): string[] {
    const covered = new Set<string>();
    if (event.cancelled) covered.add('ABGESAGT');
    if (event.soldOut) covered.add('AUSVERKAUFT');
    return event.statusLabels.filter((label) => !covered.has(label.toUpperCase()));
  }

  protected isLandscape(slide: SourceEventSlide): boolean {
    const [width, height] = slide.format.split('x').map(Number);
    return width >= height;
  }

  protected label(slide: SourceEventSlide): string {
    return formatLabel(slide.format);
  }

  /** The small precomputed thumbnail; it 404s until transcoding has made it. */
  protected thumbUrl(slide: SourceEventSlide): string {
    return this.contentService.getThumbnailUrl(slide.contentId, slide.updatedAt);
  }

  protected fullUrl(slide: SourceEventSlide): string {
    return this.contentService.getTranscodedUrl(slide.contentId, slide.updatedAt);
  }

  /** Falls back to the full image once, so a missing thumbnail still shows the slide. */
  protected onThumbError(event: Event, slide: SourceEventSlide): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback']) return;
    img.dataset['fallback'] = '1';
    img.src = this.fullUrl(slide);
  }
}
