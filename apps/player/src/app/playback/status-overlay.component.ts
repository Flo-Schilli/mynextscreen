import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { PlayerService } from '../player/player.service';
import { ConnectionService } from '../connection/connection.service';
import { PlaybackStateService } from './playback-state.service';

const AUTO_HIDE_MS = 5_000;

@Component({
  selector: 'app-status-overlay',
  template: `
    @if (visible()) {
      <div class="status-overlay">
        <div class="status-row">
          <span class="status-label">Screen</span>
          <span>{{ screenName() }} ({{ screenId() }})</span>
        </div>
        <div class="status-row">
          <span class="status-label">Playlist</span>
          <span>{{ playlistName() }}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Item</span>
          <span>{{ itemProgress() }}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Status</span>
          <span [class]="statusClass()">{{ connectionStatus() }}</span>
        </div>
        @if (streamHealthLabel()) {
          <div class="status-row">
            <span class="status-label">Stream</span>
            <span [class]="streamHealthClass()">{{ streamHealthLabel() }}</span>
          </div>
        }
        @if (groupInfo()) {
          <div class="status-row">
            <span class="status-label">Group</span>
            <span>{{ groupInfo() }}</span>
          </div>
        }
        @if (showDisconnect()) {
          <button type="button" class="disconnect" (click)="onDisconnect()">
            Disconnect this screen
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      .status-overlay {
        position: fixed;
        top: 1rem;
        left: 1rem;
        z-index: 30;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.75rem 1rem;
        background: rgb(0 0 0 / 0.7);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        backdrop-filter: blur(8px);
        font-size: 0.8125rem;
        color: var(--text-muted);
        pointer-events: none;
        animation: fadeIn 0.2s ease-in;
      }

      .status-row {
        display: flex;
        gap: 0.75rem;
      }

      .status-label {
        color: var(--text-faint);
        min-width: 4rem;
      }

      .status-connected {
        color: var(--color-online);
      }

      .status-reconnecting {
        color: var(--color-warn);
      }

      .status-disconnected {
        color: var(--color-offline);
      }

      .disconnect {
        /* The panel itself is click-through; this is the one thing in it that
           is meant to be aimed at. */
        pointer-events: auto;
        margin-top: 0.5rem;
        padding: 0.375rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: 0.375rem;
        background: rgb(0 0 0 / 0.4);
        color: var(--text-muted);
        font: inherit;
        cursor: pointer;
      }

      .disconnect:hover,
      .disconnect:focus-visible {
        border-color: rgb(239 68 68 / 0.5);
        color: rgb(248 113 113);
      }

      .stream-healthy {
        color: var(--color-online);
      }

      .stream-degraded {
        color: var(--color-warn);
      }

      .stream-stopped {
        color: var(--color-offline);
      }
    `,
  ],
})
export class StatusOverlayComponent implements OnInit, OnDestroy {
  private readonly playerService = inject(PlayerService);
  private readonly connectionService = inject(ConnectionService);
  private readonly playbackState = inject(PlaybackStateService);

  private readonly _visible = signal(true);
  private autoHideTimer: ReturnType<typeof setTimeout> | null = null;

  readonly visible = this._visible.asReadonly();
  /** Server-side per-screen toggle; absent on an older server means shown. */
  readonly showDisconnect = this.playerService.showDisconnectButton;

  readonly screenName = computed(() => this.playerService.screen()?.name ?? '—');
  readonly screenId = computed(() => this.connectionService.screenId() || '—');

  readonly playlistName = computed(() => {
    const playlist = this.playerService.activePlaylist();
    return playlist?.name ?? 'None';
  });

  readonly itemProgress = computed(() => {
    const total = this.playbackState.totalItems();
    if (total === 0) return '—';
    const current = this.playbackState.currentIndex() + 1;
    return `${current} / ${total}`;
  });

  readonly connectionStatus = computed(() => {
    const status = this.playerService.status();
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        return 'Reconnecting…';
      case 'connecting':
        return 'Connecting…';
      default:
        return 'Disconnected';
    }
  });

  readonly statusClass = computed(() => {
    const status = this.playerService.status();
    switch (status) {
      case 'connected':
        return 'status-connected';
      case 'reconnecting':
        return 'status-reconnecting';
      default:
        return 'status-disconnected';
    }
  });

  readonly streamHealthLabel = computed((): string => {
    const health = this.playbackState.streamHealth();
    if (!health) return '';
    switch (health) {
      case 'healthy':
        return 'Healthy';
      case 'degraded':
        return 'Degraded';
      case 'stopped':
        return 'Stopped';
    }
  });

  readonly streamHealthClass = computed((): string => {
    const health = this.playbackState.streamHealth();
    switch (health) {
      case 'healthy':
        return 'stream-healthy';
      case 'degraded':
        return 'stream-degraded';
      case 'stopped':
        return 'stream-stopped';
      default:
        return '';
    }
  });

  readonly groupInfo = computed((): string => {
    const group = this.playerService.groupInfo();
    if (!group) return '';

    const screen = this.playerService.screen();
    const mode = group.mode === 'mirror' ? 'Mirror' : 'Split';
    let info = `${group.name} (${mode})`;

    if (group.mode === 'split' && screen?.gridRow != null && screen?.gridColumn != null) {
      info += ` — Row ${screen.gridRow + 1}, Col ${screen.gridColumn + 1}`;
    }

    return info;
  });

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'i' || event.key === 'I') {
      this.toggle();
    }
  }

  ngOnInit(): void {
    this.scheduleAutoHide();
  }

  ngOnDestroy(): void {
    this.clearAutoHide();
  }

  /** Ends the session and sends the screen back to pairing. */
  onDisconnect(): void {
    this.connectionService.disconnect();
  }

  /**
   * Opens and closes the panel.
   *
   * Only the informational flash on start auto-hides. Once someone asks for the
   * panel it stays: it carries the disconnect action, and five seconds is not
   * enough to find and hit a button with a TV remote.
   */
  private toggle(): void {
    const isVisible = !this._visible();
    this._visible.set(isVisible);
    this.clearAutoHide();
  }

  private scheduleAutoHide(): void {
    this.clearAutoHide();
    this.autoHideTimer = setTimeout(() => {
      this._visible.set(false);
    }, AUTO_HIDE_MS);
  }

  private clearAutoHide(): void {
    if (this.autoHideTimer !== null) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }
}
