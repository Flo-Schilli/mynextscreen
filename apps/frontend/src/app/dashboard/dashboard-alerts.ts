import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardAlert, DashboardAlertTone } from './dashboard-summary.model';
import { IconComponent, IconName } from '../ui';

const TONE_ICON: Record<DashboardAlertTone, IconName> = {
  offline: 'WifiOff',
  warn: 'Alert',
  info: 'Bell',
};

const TONE_BG: Record<DashboardAlertTone, string> = {
  offline: 'var(--offline-dim)',
  warn: 'var(--warn-dim)',
  info: 'var(--info-dim)',
};

const TONE_COLOR: Record<DashboardAlertTone, string> = {
  offline: 'var(--offline)',
  warn: 'var(--warn)',
  info: 'var(--info)',
};

/**
 * Presentational alerts list for the dashboard. Renders the server-derived
 * alerts (offline screens, failed transcodes, transcode backlog) with a
 * tone-coloured icon tile and relative timestamp. The parent owns data loading.
 */
@Component({
  selector: 'app-dashboard-alerts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="alerts-list">
      @for (alert of alerts(); track alert.id) {
        <div class="alert-item">
          <span
            class="alert-icon"
            [style.background]="bg(alert.tone)"
            [style.color]="color(alert.tone)"
          >
            <mns-icon [name]="icon(alert.tone)" [size]="17" />
          </span>
          <div class="alert-body">
            <div class="alert-title">{{ alert.title }}</div>
            <div class="alert-desc">{{ alert.description }}</div>
          </div>
          @if (alert.timestamp) {
            <span class="alert-time">{{ relativeTime(alert.timestamp) }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .alert-item {
      display: flex;
      gap: 12px;
      padding: 12px 13px;
      border-radius: 12px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }
    .alert-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 9px;
      flex-shrink: 0;
    }
    .alert-body {
      min-width: 0;
      flex: 1;
    }
    .alert-title {
      font-size: 0.84375rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .alert-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 1px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .alert-time {
      font-size: 0.71875rem;
      color: var(--text-faint);
      white-space: nowrap;
      flex-shrink: 0;
    }
  `,
})
export class DashboardAlerts {
  readonly alerts = input.required<DashboardAlert[]>();

  icon(tone: DashboardAlertTone): IconName {
    return TONE_ICON[tone];
  }

  bg(tone: DashboardAlertTone): string {
    return TONE_BG[tone];
  }

  color(tone: DashboardAlertTone): string {
    return TONE_COLOR[tone];
  }

  /** Compact relative time, e.g. "2 h ago", "5 min ago", "just now". */
  relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return `${Math.floor(hours / 24)} d ago`;
  }
}
