import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { BadgeComponent, BtnComponent, IconComponent } from '../ui';
import { LiveStream } from './live-stream.model';
import { LiveStreamMonitor } from './live-stream-monitor';

/**
 * Presentational grid card for a single live stream (Vorbild: `screen-tile.ts`).
 * Shows the cinematic monitor band, name + source, a status/protocol/preset
 * badge row, a footer with a status line plus a Go-live/Stop button, and an
 * actions menu (Open console / Go-live·Stop / Delete).
 *
 * Status mapping (Entsch. 2): `active` → Live (pulsing badge), `idle`/`error`
 * → Offline; `error` additionally surfaces an error hint.
 */
@Component({
  selector: 'app-live-stream-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, BadgeComponent, BtnComponent, LiveStreamMonitor, TranslocoDirective],
  template: `
    <div class="card" *transloco="let t">
      <div
        class="band"
        role="button"
        tabindex="0"
        [attr.aria-label]="t('liveStreams.card.openAria', { name: stream().name })"
        (click)="open.emit(stream())"
        (keydown.enter)="open.emit(stream())"
      >
        <app-live-stream-monitor
          [streamId]="stream().id"
          [status]="stream().status"
          [transcodingPreset]="stream().transcodingPreset"
          [audioEnabled]="stream().audioEnabled"
        />
      </div>

      <div class="body">
        <div class="head">
          <div
            class="title-col"
            role="button"
            tabindex="0"
            [attr.aria-label]="t('liveStreams.card.openAria', { name: stream().name })"
            (click)="open.emit(stream())"
            (keydown.enter)="open.emit(stream())"
          >
            <div class="name">{{ stream().name }}</div>
            <div class="source">{{ stream().sourceUrl }}</div>
          </div>

          <div class="menu-wrap">
            <button
              type="button"
              class="menu-btn"
              [title]="t('liveStreams.card.actions')"
              [attr.aria-label]="t('liveStreams.card.streamActions')"
              [class.active]="menuOpen()"
              (click)="toggleMenu($event)"
            >
              <mns-icon name="Dots" [size]="18" />
            </button>
            @if (menuOpen()) {
              <button
                type="button"
                class="menu-scrim"
                [attr.aria-label]="t('liveStreams.card.closeMenu')"
                (click)="closeMenu($event)"
              ></button>
              <div class="menu">
                <button type="button" class="menu-item" (click)="onOpen($event)">
                  <mns-icon name="Eye" [size]="16" class="menu-icon" />
                  {{ t('liveStreams.card.openConsole') }}
                </button>
                <button type="button" class="menu-item" (click)="onToggle($event)">
                  @if (live()) {
                    <mns-icon name="Power" [size]="16" class="menu-icon" />
                    {{ t('liveStreams.card.stopStream') }}
                  } @else {
                    <mns-icon name="Play" [size]="15" class="menu-icon online" />
                    {{ t('liveStreams.card.goLive') }}
                  }
                </button>
                <div class="menu-sep"></div>
                <button type="button" class="menu-item danger" (click)="onDelete($event)">
                  <mns-icon name="Trash" [size]="15" /> {{ t('liveStreams.card.delete') }}
                </button>
              </div>
            }
          </div>
        </div>

        <div class="badges">
          <mns-badge [tone]="live() ? 'offline' : 'neutral'" icon="Cast">
            {{ statusLabel() }}
          </mns-badge>
          <mns-badge tone="neutral">{{ protocolLabel() }}</mns-badge>
          <mns-badge tone="neutral">{{ presetLabel() }}</mns-badge>
        </div>

        @if (stream().status === 'error') {
          <div class="error-hint">
            <mns-icon name="Alert" [size]="14" /> {{ t('liveStreams.card.errorHint') }}
          </div>
        }

        <div class="footer">
          <span class="status-text">{{ statusLabel() }}</span>
          <mns-btn
            [variant]="live() ? 'danger' : 'soft'"
            size="sm"
            [icon]="live() ? 'Power' : 'Play'"
            (mnsClick)="goToggle.emit(stream())"
          >
            {{ live() ? t('liveStreams.card.stop') : t('liveStreams.card.goLive') }}
          </mns-btn>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow);
      overflow: visible;
      transition:
        border-color 180ms,
        box-shadow 180ms,
        transform 180ms;
    }
    .card:hover {
      border-color: var(--accent);
      box-shadow: var(--shadow-lg);
      transform: translateY(-1px);
    }
    .band {
      padding: 14px 14px 0;
      cursor: pointer;
    }
    .body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .head {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .title-col {
      flex: 1;
      min-width: 0;
      cursor: pointer;
    }
    .name {
      font-weight: 700;
      font-size: 15.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .source {
      font-family: var(--font-mono, monospace);
      font-size: 11.5px;
      color: var(--text-muted);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .menu-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .menu-btn {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
    }
    .menu-btn.active {
      background: var(--surface-3);
    }
    .menu-scrim {
      position: fixed;
      inset: 0;
      z-index: 40;
      border: none;
      background: transparent;
      cursor: default;
    }
    .menu {
      position: absolute;
      z-index: 50;
      top: calc(100% + 6px);
      right: 0;
      min-width: 192px;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: 13px;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      padding: 6px;
      animation: fadeUp 0.15s ease both;
    }
    @media (prefers-reduced-motion: reduce) {
      .menu {
        animation: none;
      }
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 11px;
      border-radius: 9px;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text);
    }
    .menu-item:hover {
      background: var(--surface-2);
    }
    .menu-item.danger {
      color: var(--color-offline);
    }
    .menu-icon {
      color: var(--text-muted);
    }
    .menu-icon.online {
      color: var(--color-online);
    }
    .menu-sep {
      height: 1px;
      background: var(--border);
      margin: 6px 4px;
    }
    .badges {
      display: flex;
      align-items: center;
      gap: 7px;
      flex-wrap: wrap;
    }
    .error-hint {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-offline);
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border);
      padding-top: 12px;
    }
    .status-text {
      font-family: var(--font-mono, monospace);
      font-size: 12px;
      color: var(--text-muted);
    }
    @media (prefers-reduced-motion: reduce) {
      .card {
        transition: none;
      }
    }
  `,
})
export class LiveStreamCard {
  readonly stream = input.required<LiveStream>();

  readonly open = output<LiveStream>();
  readonly goToggle = output<LiveStream>();
  readonly delete = output<LiveStream>();

  private readonly transloco = inject(TranslocoService);

  protected readonly menuOpen = signal(false);

  protected readonly live = computed(() => this.stream().status === 'active');

  protected readonly statusLabel = computed(() =>
    this.transloco.translate(
      this.live() ? 'liveStreams.status.live' : 'liveStreams.status.offline',
    ),
  );

  protected readonly protocolLabel = computed(() => this.stream().protocol.toUpperCase());

  protected readonly presetLabel = computed(() =>
    this.transloco.translate('liveStreams.preset.' + this.stream().transcodingPreset),
  );

  protected toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  protected closeMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.set(false);
  }

  protected onOpen(event: Event): void {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.open.emit(this.stream());
  }

  protected onToggle(event: Event): void {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.goToggle.emit(this.stream());
  }

  protected onDelete(event: Event): void {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.delete.emit(this.stream());
  }
}
