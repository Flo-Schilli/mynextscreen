import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Screen, ScreenListItem } from './screen.model';
import { IconComponent } from '../ui';
import { ContentService } from '../content/content.service';

/**
 * `app-not-running` and `tv-unreachable` only exist for a screen a site agent
 * looks after. They are the reason the player is not reporting, which the
 * heartbeat alone cannot give — without an agent both of them look like
 * `offline`, which is exactly what this used to show for all three.
 */
type TileStatus = 'online' | 'app-not-running' | 'tv-unreachable' | 'offline' | 'never';

/** Maps a `WIDTHxHEIGHT` resolution string to a short label for the corner badge. */
export function resolutionLabel(resolution: string): string {
  const presets: Record<string, string> = {
    '1920x1080': 'FHD',
    '3840x2160': '4K',
    '2560x1440': 'QHD',
    '1280x720': 'HD',
    '1080x1920': 'FHD↕',
  };
  return presets[resolution] ?? resolution;
}

/**
 * Shared presentational screen card. Used by both the `/screens` grid and the
 * dashboard. Renders a thumbnail band with a top-left status badge and top-right
 * resolution badge, a name + location body, and a footer that shows the current
 * playlist when online or the last-seen timestamp otherwise.
 *
 * The whole card is clickable and emits `open` (also via keyboard). Set
 * `showActions` to expose a single top-right trash button that emits `delete`
 * without triggering `open`; the dashboard leaves it off.
 */
@Component({
  selector: 'app-screen-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, DatePipe, RouterLink, TranslocoDirective],
  template: `
    <div
      *transloco="let t"
      class="screen-card"
      tabindex="0"
      role="button"
      [attr.aria-label]="t('screens.tile.open', { name: screen().name })"
      (click)="open.emit(screen())"
      (keydown.enter)="open.emit(screen())"
      (keydown.space)="open.emit(screen())"
    >
      <!-- Thumbnail band with status overlay -->
      <div class="thumb-band" [class.dim]="status() !== 'online'">
        @if (thumbnailUrl(); as src) {
          <img [src]="src" alt="" class="thumb-img" loading="lazy" />
          @if (isVideoThumbnail()) {
            <span class="thumb-play-overlay" aria-hidden="true">
              <span class="thumb-play-badge">&#9654;</span>
            </span>
          }
        } @else {
          <mns-icon name="Screens" [size]="30" class="thumb-glyph" />
        }

        <!-- Top-left status badge -->
        <span class="status-badge" [class]="status()">
          <span class="status-dot" [class]="status()"></span>
          {{ t(statusLabelKey()) }}
        </span>

        <!-- Top-right resolution badge -->
        <span class="res-badge">{{ resLabel() }}</span>

        <!-- Remote control, for a screen a site agent looks after -->
        @if (agentId(); as agent) {
          <a
            class="agent-link"
            [routerLink]="['/site-agents', agent]"
            [title]="t('screens.tile.siteAgent')"
            [attr.aria-label]="t('screens.tile.siteAgentAria')"
            (click)="$event.stopPropagation()"
          >
            <mns-icon name="Cast" [size]="14" />
          </a>
        }

        <!-- Top-right delete action -->
        @if (showActions()) {
          <button
            type="button"
            class="delete-btn"
            [attr.aria-label]="t('screens.tile.deleteScreen')"
            (click)="onDelete($event)"
          >
            <mns-icon name="Trash" [size]="15" />
          </button>
        }
      </div>

      <!-- Body -->
      <div class="card-body">
        <div class="card-head">
          <span class="screen-name">{{ screen().name }}</span>
        </div>

        <div class="location-row">
          <mns-icon name="MapPin" [size]="13" class="location-icon" />
          <span class="location-text">{{ screen().location || t('screens.tile.noLocation') }}</span>
        </div>

        <div class="card-sep"></div>

        <div class="card-footer">
          @if (status() === 'online' && playlistName()) {
            <span class="now-playing">
              <span class="play-glyph" aria-hidden="true">▶</span>
              {{ playlistName() }}
            </span>
          } @else if (screen().lastHeartbeat) {
            <span class="last-seen">{{
              t('screens.tile.lastSeen', { time: (screen().lastHeartbeat | date: 'short') ?? '' })
            }}</span>
          } @else {
            <span class="last-seen">{{ t('screens.tile.neverConnected') }}</span>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .screen-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      box-shadow: var(--shadow);
      transition:
        border-color 180ms,
        box-shadow 180ms,
        transform 180ms;
    }
    .screen-card:hover,
    .screen-card:focus-visible {
      border-color: var(--accent);
      box-shadow: var(--shadow-lg);
      transform: translateY(-1px);
      outline: none;
    }

    /* Thumbnail band */
    .thumb-band {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: var(--surface-2);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .thumb-band.dim {
      filter: grayscale(0.55) brightness(0.78);
    }
    .thumb-glyph {
      color: var(--text-faint);
    }
    .thumb-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Play badge centered over a video thumbnail (matches the content grid). */
    .thumb-play-overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      pointer-events: none;
    }
    .thumb-play-badge {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      font-size: 0.9rem;
      padding-left: 0.15rem;
    }

    /* Status badge (blurred dark pill, top-left) */
    .status-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 9px;
      border-radius: 99px;
      font-size: 11.5px;
      font-weight: 600;
      color: #fff;
      background: rgba(8, 11, 18, 0.6);
      backdrop-filter: blur(6px);
    }
    .status-badge.online {
      color: var(--color-online);
    }
    .agent-link {
      position: absolute;
      left: 10px;
      bottom: 10px;
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 8px;
      color: #fff;
      background: rgba(8, 11, 18, 0.6);
      backdrop-filter: blur(6px);
      transition: background 120ms;
    }
    .agent-link:hover {
      background: rgba(8, 11, 18, 0.85);
    }
    .status-badge.app-not-running {
      color: var(--color-warn);
    }
    .status-badge.tv-unreachable {
      color: var(--color-offline);
    }
    .status-dot.app-not-running {
      background: var(--color-warn);
    }
    .status-dot.tv-unreachable {
      background: var(--color-offline);
    }
    .status-badge.offline {
      color: var(--color-offline);
    }
    .status-badge.never {
      color: var(--text-muted);
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.online {
      background: var(--color-online);
      box-shadow: 0 0 0 3px var(--online-dim);
    }
    .status-dot.offline {
      background: var(--color-offline);
      box-shadow: 0 0 0 3px var(--offline-dim);
    }
    .status-dot.never {
      background: var(--text-faint);
    }

    /* Resolution badge (top-right) */
    .res-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 9px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text);
      background: rgba(8, 11, 18, 0.6);
      backdrop-filter: blur(6px);
      font-family: var(--font-mono, monospace);
    }

    /* Delete action (bottom-right of band, clear of the resolution badge) */
    .delete-btn {
      position: absolute;
      bottom: 8px;
      right: 8px;
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid transparent;
      color: var(--color-offline);
      background: rgba(8, 11, 18, 0.6);
      backdrop-filter: blur(6px);
      cursor: pointer;
      transition:
        background 150ms,
        color 150ms,
        border-color 150ms;
    }
    .delete-btn:hover {
      color: #fff;
      background: var(--color-offline);
      border-color: var(--color-offline);
    }

    /* Body */
    .card-body {
      padding: 13px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card-head {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .screen-name {
      flex: 1;
      min-width: 0;
      font-size: 14.5px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Location row */
    .location-row {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
    }
    .location-icon {
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .location-text {
      font-size: 12.5px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Separator + footer */
    .card-sep {
      height: 1px;
      background: var(--border);
      margin: 2px 0;
    }
    .card-footer {
      font-size: 12.5px;
      min-width: 0;
    }
    .now-playing {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: var(--accent);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .play-glyph {
      font-size: 10px;
    }
    .last-seen {
      color: var(--text-faint);
    }

    @media (prefers-reduced-motion: reduce) {
      .screen-card,
      .delete-btn {
        transition: none;
      }
    }
  `,
})
export class ScreenTile {
  private readonly content = inject(ContentService);

  readonly screen = input.required<Screen | ScreenListItem>();
  readonly showActions = input<boolean>(false);

  readonly open = output<Screen>();
  readonly delete = output<Screen>();

  /** First playlist item of the active playlist, when the screen carries one. */
  private readonly thumbnailRef = computed(() => {
    const s = this.screen();
    return 'currentPlaylistThumbnail' in s ? s.currentPlaylistThumbnail : null;
  });

  /** Still-image URL for the playlist's first item, or null to show the icon. */
  protected readonly thumbnailUrl = computed<string | null>(() => {
    const ref = this.thumbnailRef();
    if (!ref) return null;
    return this.content.getStaticThumbnailUrl({
      id: ref.contentId,
      type: ref.type,
      thumbnailSizeBytes: ref.thumbnailSizeBytes,
    });
  });

  protected readonly isVideoThumbnail = computed<boolean>(
    () => this.thumbnailRef()?.type === 'video',
  );

  protected readonly status = computed<TileStatus>(() => {
    const s = this.screen();
    if (s.isOnline) return 'online';

    const reachability = 'reachability' in s ? s.reachability : null;
    if (reachability === 'reachable') return 'app-not-running';
    if (reachability === 'unreachable') return 'tv-unreachable';

    return s.lastHeartbeat ? 'offline' : 'never';
  });

  protected readonly statusLabelKey = computed<string>(() => {
    switch (this.status()) {
      case 'online':
        return 'screens.tile.status.online';
      case 'app-not-running':
        return 'screens.tile.status.appNotRunning';
      case 'tv-unreachable':
        return 'screens.tile.status.tvUnreachable';
      case 'offline':
        return 'screens.tile.status.offline';
      default:
        return 'screens.tile.status.never';
    }
  });

  /** The agent that looks after this screen, for the remote-control shortcut. */
  protected readonly agentId = computed<string | null>(() => {
    const s = this.screen();
    return 'agentId' in s ? s.agentId : null;
  });

  protected readonly resLabel = computed<string>(() => resolutionLabel(this.screen().resolution));

  protected readonly playlistName = computed<string | null>(() => {
    const s = this.screen();
    return 'currentPlaylistName' in s ? s.currentPlaylistName : null;
  });

  protected onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.screen());
  }
}
