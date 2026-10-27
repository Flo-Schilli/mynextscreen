import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { RulePreviewItem, RulePreviewResult } from './playlist.model';
import { PlaylistFormatService } from './playlist-format.service';
import { ContentService } from '../content/content.service';
import { LanguageService } from '../i18n/language.service';
import { formatIsoDate } from '../i18n/locale-date-input';
import { LocaleDatePipe } from '../i18n/locale-format.pipes';
import { BadgeComponent, CardComponent, CardHeadComponent, IconComponent } from '../ui';

export type RulePreviewState =
  | { status: 'invalid' }
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; result: RulePreviewResult };

/**
 * Live result of the rule being edited: the events it would select right now,
 * in playlist order, with their slide and when each one drops out. Purely
 * presentational; the rule editor feeds the debounced preview state in.
 */
@Component({
  selector: 'app-playlist-rule-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocaleDatePipe,
    BadgeComponent,
    CardComponent,
    CardHeadComponent,
    IconComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-card *transloco="let t">
      <mns-card-head [title]="t('playlists.rule.preview.title')" [sub]="sub()" icon="Eye" />
      @switch (state().status) {
        @case ('invalid') {
          <p class="text-sm text-muted py-2">{{ t('playlists.rule.preview.invalid') }}</p>
        }
        @case ('loading') {
          <p class="text-sm text-muted py-2">{{ t('playlists.rule.preview.loading') }}</p>
        }
        @case ('failed') {
          <p class="text-sm text-offline py-2">{{ t('playlists.rule.preview.failed') }}</p>
        }
        @default {
          @if (items().length === 0) {
            <p class="text-sm text-muted py-2">{{ t('playlists.rule.preview.empty') }}</p>
          } @else {
            <ol class="flex flex-col gap-2">
              @for (item of items(); track item.sourceEventId; let i = $index) {
                <li
                  class="preview-item flex items-center gap-3 px-3 py-2 rounded-[12px] bg-surface-2 border border-border"
                >
                  <span class="font-mono w-5 text-center text-[12px] font-bold text-faint">{{
                    i + 1
                  }}</span>
                  <span
                    class="relative w-14 h-[34px] rounded-[6px] flex-shrink-0 overflow-hidden bg-surface-3"
                  >
                    <img
                      [src]="thumbUrl(item)"
                      alt=""
                      class="w-full h-full object-cover"
                      loading="lazy"
                      (error)="onThumbError($event, item)"
                    />
                  </span>
                  <div class="flex-1 min-w-0">
                    <div class="text-[13.5px] font-semibold truncate">{{ item.title }}</div>
                    <div class="text-[11.5px] text-muted truncate">
                      {{ dateLabel(item.eventDate) }}
                      @if (item.startTime) {
                        {{ item.startTime }}
                      }
                      · {{ item.venueCanonical }}
                    </div>
                  </div>
                  @if (item.cancelled) {
                    <mns-badge tone="offline">{{
                      t('playlists.rule.preview.cancelled')
                    }}</mns-badge>
                  }
                  @if (item.soldOut) {
                    <mns-badge tone="warning">{{ t('playlists.rule.preview.soldOut') }}</mns-badge>
                  }
                  <span
                    class="hidden sm:inline-flex items-center gap-1 text-[11.5px] text-faint whitespace-nowrap"
                  >
                    <mns-icon name="Clock" [size]="12" />
                    {{
                      t('playlists.rule.preview.expires', {
                        date: item.expiresAt | localeDate: 'short',
                      })
                    }}
                  </span>
                </li>
              }
            </ol>
          }
        }
      }
    </mns-card>
  `,
  host: { class: 'block' },
})
export class PlaylistRulePreview {
  private readonly contentService = inject(ContentService);
  private readonly language = inject(LanguageService);
  private readonly format = inject(PlaylistFormatService);
  private readonly transloco = inject(TranslocoService);

  readonly state = input.required<RulePreviewState>();

  protected readonly items = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.result.items : [];
  });

  protected readonly sub = computed(() => {
    const state = this.state();
    if (state.status !== 'ready') return undefined;
    return this.translateSub(state.result);
  });

  protected dateLabel(iso: string): string {
    return formatIsoDate(iso, this.language.locale()) || iso;
  }

  protected thumbUrl(item: RulePreviewItem): string {
    return this.contentService.getThumbnailUrl(item.contentId, item.contentUpdatedAt);
  }

  protected onThumbError(event: Event, item: RulePreviewItem): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback']) return;
    img.dataset['fallback'] = '1';
    img.src = this.contentService.getTranscodedUrl(item.contentId, item.contentUpdatedAt);
  }

  private translateSub(result: RulePreviewResult): string {
    return this.transloco.translate('playlists.rule.preview.sub', {
      count: result.items.length,
      duration: this.format.formatDuration(result.totalDurationSeconds),
    });
  }
}
