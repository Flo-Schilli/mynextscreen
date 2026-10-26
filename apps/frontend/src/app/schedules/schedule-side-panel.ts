import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { DayTimeline } from './schedule-calendar.service';
import { CardComponent, CardHeadComponent, IconComponent } from '../ui';

/**
 * Presentational side panel listing the schedule entries that occur on the
 * currently selected day.
 */
@Component({
  selector: 'app-schedule-side-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, CardHeadComponent, IconComponent, TranslocoDirective],
  template: `
    <div class="side-panel w-64 flex-shrink-0" *transloco="let t">
      <mns-card>
        <mns-card-head
          [title]="t('schedules.sidePanel.today')"
          [sub]="headSub()"
          icon="Clock"
        ></mns-card-head>
        @if (timeline().length === 0) {
          <p class="empty-text text-[13px] text-faint py-2">
            {{ t('schedules.sidePanel.empty') }}
          </p>
        }
        @for (item of timeline(); track $index) {
          <div class="timeline-item flex gap-2.5 py-2.5 border-b border-border last:border-b-0">
            <div
              class="timeline-colour w-[3px] rounded-sm flex-shrink-0 self-stretch"
              [style.background]="item.colour"
            ></div>
            <div class="timeline-info flex flex-col gap-0.5 min-w-0">
              <span
                class="timeline-name text-[13px] font-bold text-text truncate flex items-center gap-1"
              >
                @if (item.isGroup) {
                  <span class="group-badge-inline text-[9px] font-extrabold text-accent">G</span>
                }
                {{ item.playlistName }}
                @if (item.isRecurring) {
                  <mns-icon name="Refresh" [size]="10" class="repeat-icon-sm text-faint" />
                }
              </span>
              @if (item.genres) {
                <span
                  class="genre-pill self-start inline-flex items-center gap-0.5 max-w-full rounded px-1 text-[10px] font-bold leading-[15px] bg-accent-soft text-accent"
                  [title]="t('schedules.genreGroup.badgeTitle', { genres: item.genres })"
                >
                  <mns-icon name="Sparkle" [size]="10" class="flex-shrink-0" />
                  <span class="truncate">{{ item.genres }}</span>
                </span>
              }
              <span class="timeline-target text-[11px] text-muted truncate">{{
                item.targetName
              }}</span>
              <span class="timeline-time text-[11px] font-mono font-semibold text-faint">
                {{ item.startTime }} - {{ item.endTime }}
              </span>
            </div>
          </div>
        }
      </mns-card>
    </div>
  `,
})
export class ScheduleSidePanel {
  readonly dateLabel = input.required<string>();
  readonly timeline = input.required<DayTimeline[]>();

  private readonly transloco = inject(TranslocoService);

  readonly headSub = computed(() =>
    this.transloco.translate('schedules.sidePanel.headSub', {
      date: this.dateLabel(),
      count: this.timeline().length,
    }),
  );
}
