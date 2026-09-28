import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Screen, CreateScreenRequest, UpdateScreenRequest } from './screen.model';
import { ToggleRowComponent } from '../ui';

const PRESET_RESOLUTIONS = ['1920x1080', '3840x2160', '1280x720', '2560x1440', '1080x1920'];

type ScreenFormMode = 'create' | 'edit';

/**
 * Unified screen modal — replaces the former create- and edit-form components.
 *
 * In `create` mode it shows the pairing hint banner plus a required 6-digit
 * pairing-code field and emits `create` with a {@link CreateScreenRequest}.
 * In `edit` mode it prefills from `screen`, hides the pairing-code field, shows a
 * read-only status/last-seen/registered info block plus a "Re-pair" section that
 * emits `repair` with a 6-digit code, and emits `update` with an
 * {@link UpdateScreenRequest}. The parent owns all HTTP work and feeds
 * `saving`/`error`/`repairing` back in.
 *
 * NOTE: stable IDs (#screenName, #screenLocation, #screenResolution,
 * #screenCustomRes, #screenPairingCode, #repairPairingCode) and the `.error`
 * class are load-bearing for specs — keep them when re-skinning.
 */
@Component({
  selector: 'app-screen-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe, ToggleRowComponent],
  template: `
    <div
      class="pairing-overlay"
      role="dialog"
      aria-modal="true"
      tabindex="0"
      [attr.aria-label]="panelTitle()"
      (click)="onBackdropClick($event)"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="pairing-panel"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        (keydown.escape)="dismiss.emit()"
      >
        <!-- Header -->
        <div class="panel-header">
          <span class="panel-icon">
            @if (mode() === 'create') {
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M3 16.5a4.5 4.5 0 0 1 4.5 4.5M3 12a9 9 0 0 1 9 9M3 7.5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5"
                />
                <circle cx="3.5" cy="20.5" r="0.8" fill="currentColor" stroke="none" />
              </svg>
            } @else {
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            }
          </span>
          <div>
            <div class="panel-title">{{ panelTitle() }}</div>
            <div class="panel-sub">{{ panelSub() }}</div>
          </div>
          <button type="button" class="panel-close" aria-label="Close" (click)="dismiss.emit()">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Hint banner (create only) -->
        @if (mode() === 'create') {
          <div class="hint-banner">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="hint-icon"
              aria-hidden="true"
            >
              <path
                d="M3 16.5a4.5 4.5 0 0 1 4.5 4.5M3 12a9 9 0 0 1 9 9M3 7.5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5"
              />
              <circle cx="3.5" cy="20.5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
            <p class="hint-text">
              @if (playerUrl()) {
                Open <strong>{{ playerUrl() }}</strong> on your display — it shows a 6-digit code.
              } @else {
                Open the player on your display — it shows a 6-digit code. Set
                <strong>PLAYER_BASE_URL</strong> on the server to show its address here.
              }
            </p>
          </div>
        }

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="panel-form">
          <div class="form-row">
            <!-- Name -->
            <div class="form-group">
              <label class="field-label" for="screenName">Screen name</label>
              <input
                id="screenName"
                type="text"
                [(ngModel)]="name"
                name="screenName"
                required
                placeholder="e.g. Lobby — Main Wall"
                class="field-input"
              />
            </div>

            <!-- Location -->
            <div class="form-group">
              <label class="field-label" for="screenLocation">Location</label>
              <input
                id="screenLocation"
                type="text"
                [(ngModel)]="location"
                name="screenLocation"
                required
                placeholder="HQ · Ground Floor"
                class="field-input"
              />
            </div>
          </div>

          <!-- Resolution -->
          <div class="form-group">
            <label class="field-label" for="screenResolution">Display resolution</label>
            <select
              id="screenResolution"
              [(ngModel)]="resolution"
              name="screenResolution"
              required
              class="field-input field-select"
            >
              <option value="1920x1080">1920 × 1080 · Full HD</option>
              <option value="3840x2160">3840 × 2160 · 4K UHD</option>
              <option value="1280x720">1280 × 720 · HD</option>
              <option value="2560x1440">2560 × 1440 · QHD</option>
              <option value="1080x1920">1080 × 1920 · Full HD Portrait</option>
              <option value="custom">Custom resolution…</option>
            </select>
          </div>

          @if (resolution === 'custom') {
            <div class="form-group">
              <label class="field-label" for="screenCustomRes">Custom resolution</label>
              <input
                id="screenCustomRes"
                type="text"
                [(ngModel)]="customResolution"
                name="screenCustomResolution"
                required
                placeholder="e.g. 1920x1200"
                class="field-input mono"
              />
            </div>
          }

          <!-- Player options (edit only) -->
          @if (mode() === 'edit') {
            <div class="form-group">
              <span class="field-label">Player options</span>
              <div class="toggle-card">
                <mns-toggle-row
                  icon="Video"
                  label="Show “Click to unmute”"
                  desc="Display the unmute overlay on videos with sound."
                  [(checked)]="showUnmuteButton"
                />
                <mns-toggle-row
                  icon="Power"
                  label="Show “Disconnect”"
                  desc="Display the disconnect button in the player corner."
                  [(checked)]="showDisconnectButton"
                />
              </div>
            </div>
          }

          <!-- Pairing code (create only) -->
          @if (mode() === 'create') {
            <div class="form-group">
              <label class="field-label" for="screenPairingCode">Pairing code</label>
              <input
                id="screenPairingCode"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                maxlength="6"
                [(ngModel)]="pairingCode"
                name="screenPairingCode"
                required
                placeholder="6-digit code from the display"
                class="field-input mono pairing-input"
              />
            </div>
          }

          @if (localError() || error()) {
            <p class="error">{{ localError() || error() }}</p>
          }

          <div class="form-actions">
            <button type="button" class="btn-cancel" (click)="dismiss.emit()">Cancel</button>
            <button type="submit" class="btn-submit" [disabled]="saving()">
              {{ submitLabel() }}
            </button>
          </div>
        </form>

        <!-- Read-only info + re-pair (edit only) -->
        @if (mode() === 'edit' && screen(); as s) {
          <div class="info-section">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Status</span>
                <span
                  class="status-badge"
                  [class.online]="s.isOnline"
                  [class.offline]="!s.isOnline"
                >
                  {{ s.isOnline ? 'Online' : 'Offline' }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Last seen</span>
                <span class="info-value">{{
                  s.lastHeartbeat ? (s.lastHeartbeat | date: 'medium') : 'Never'
                }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Player version</span>
                <span class="info-value">{{ s.playerVersion ?? 'Not reported' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Registered</span>
                <span class="info-value">{{ s.createdAt | date: 'mediumDate' }}</span>
              </div>
            </div>

            <div class="repair-block">
              <h3 class="repair-title">Refresh player</h3>
              <p class="repair-hint">
                Reload the display's player remotely (like pressing F5). Useful after changing
                settings or if the screen looks stuck.
              </p>
              <div class="repair-row">
                <button
                  type="button"
                  class="btn-repair"
                  (click)="refresh.emit()"
                  [disabled]="refreshing() || !s.isOnline"
                >
                  {{ refreshing() ? 'Refreshing…' : 'Refresh player' }}
                </button>
                @if (!s.isOnline) {
                  <span class="repair-hint">Screen is offline.</span>
                }
              </div>
            </div>

            <div class="repair-block">
              <h3 class="repair-title">Re-pair display</h3>
              <p class="repair-hint">
                Reconnecting a display? Open it to show a fresh 6-digit code, then enter it here to
                issue a new key. The current key is invalidated immediately.
              </p>
              <div class="repair-row">
                <input
                  id="repairPairingCode"
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  maxlength="6"
                  [(ngModel)]="repairCode"
                  name="repairPairingCode"
                  placeholder="6-digit code"
                  class="field-input mono pairing-input repair-input"
                />
                <button
                  type="button"
                  class="btn-repair"
                  (click)="onRepair()"
                  [disabled]="repairing()"
                >
                  {{ repairing() ? 'Re-pairing…' : 'Re-pair' }}
                </button>
              </div>
              @if (repairError()) {
                <p class="error">{{ repairError() }}</p>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    /* Overlay */
    .pairing-overlay {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(4, 6, 11, 0.55);
      backdrop-filter: blur(6px);
      animation: fadeIn 0.2s ease both;
    }
    @media (prefers-reduced-motion: reduce) {
      .pairing-overlay {
        animation: none;
      }
    }

    /* Panel */
    .pairing-panel {
      width: 100%;
      max-width: 520px;
      max-height: calc(100vh - 2rem);
      overflow-y: auto;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--r-xl, 16px);
      box-shadow: var(--shadow-lg);
      animation: fadeUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1) both;
    }
    @media (prefers-reduced-motion: reduce) {
      .pairing-panel {
        animation: none;
      }
    }

    /* Header */
    .panel-header {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
    }
    .panel-icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 11px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #fff;
      flex-shrink: 0;
    }
    .panel-title {
      font-size: 17px;
      font-weight: 700;
    }
    .panel-sub {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 1px;
    }
    .panel-close {
      margin-left: auto;
      align-self: flex-start;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      flex-shrink: 0;
      transition:
        background-color 120ms,
        color 120ms;
    }
    .panel-close:hover {
      background: var(--hover);
      color: var(--text);
    }
    @media (prefers-reduced-motion: reduce) {
      .panel-close {
        transition: none;
      }
    }

    /* Hint banner */
    .hint-banner {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin: 20px 24px 0;
      padding: 14px;
      border-radius: 14px;
      background: var(--accent-soft);
      border: 1px solid var(--border);
    }
    .hint-icon {
      color: var(--accent);
      flex-shrink: 0;
      margin-top: 1px;
    }
    .hint-text {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.45;
      margin: 0;
    }
    .hint-text strong {
      color: var(--text);
    }

    /* Form */
    .panel-form {
      padding: 20px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
    @media (min-width: 640px) {
      .form-row {
        grid-template-columns: 1fr 1fr;
      }
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .field-input {
      width: 100%;
      padding: 11px 13px;
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      background: var(--surface-2);
      border: 1px solid var(--border-strong);
      color: var(--text);
      outline: none;
      transition:
        border-color 150ms,
        box-shadow 150ms;
    }
    .field-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .field-select {
      appearance: none;
      cursor: pointer;
    }
    .mono {
      font-family: var(--font-mono, monospace);
    }
    .pairing-input {
      letter-spacing: 0.18em;
    }
    .toggle-card {
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      background: var(--surface-2);
      padding: 2px 13px;
    }

    /* Error */
    .error {
      font-size: 13px;
      color: var(--offline);
      margin: 0;
    }

    /* Actions */
    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 4px;
    }
    .btn-cancel,
    .btn-submit {
      flex: 1;
      padding: 11px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition:
        filter 150ms,
        opacity 150ms;
    }
    .btn-cancel {
      background: transparent;
      border: 1px solid var(--border-strong);
      color: var(--text);
    }
    .btn-cancel:hover {
      filter: brightness(1.06);
    }
    .btn-submit {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      border: none;
      color: #fff;
    }
    .btn-submit:hover:not(:disabled) {
      filter: brightness(1.06);
    }
    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Read-only info + re-pair section (edit) */
    .info-section {
      padding: 0 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
    }
    @media (min-width: 640px) {
      .info-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-label {
      font-size: 11.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .info-value {
      font-size: 13.5px;
      color: var(--text);
    }
    .status-badge {
      width: fit-content;
      padding: 2px 10px;
      border-radius: 99px;
      font-size: 12.5px;
      font-weight: 600;
    }
    .status-badge.online {
      background: var(--online-dim);
      color: var(--online);
    }
    .status-badge.offline {
      background: var(--offline-dim);
      color: var(--offline);
    }

    .repair-block {
      border-top: 1px solid var(--border);
      padding-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .repair-title {
      margin: 0;
      font-size: 14.5px;
      font-weight: 700;
    }
    .repair-hint {
      margin: 0;
      font-size: 12.5px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .repair-row {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 4px;
    }
    .repair-input {
      flex: 1;
      max-width: 12rem;
    }
    .btn-repair {
      padding: 11px 16px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      border: none;
      color: #fff;
      transition:
        filter 150ms,
        opacity 150ms;
    }
    .btn-repair:hover:not(:disabled) {
      filter: brightness(1.06);
    }
    .btn-repair:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (prefers-reduced-motion: reduce) {
      .field-input,
      .btn-cancel,
      .btn-submit,
      .btn-repair {
        transition: none;
      }
    }
  `,
})
export class ScreenForm implements OnInit {
  readonly mode = input.required<ScreenFormMode>();
  readonly screen = input<Screen>();
  /** Player URL shown in the create-mode pairing hint (env-driven). */
  readonly playerUrl = input<string>('');
  readonly saving = input<boolean>(false);
  readonly error = input<string>('');
  readonly repairing = input<boolean>(false);
  readonly refreshing = input<boolean>(false);

  readonly create = output<CreateScreenRequest>();
  readonly update = output<UpdateScreenRequest>();
  readonly repair = output<string>();
  readonly refresh = output<void>();
  readonly dismiss = output<void>();

  protected name = '';
  protected location = '';
  protected resolution = '1920x1080';
  protected customResolution = '';
  protected pairingCode = '';
  protected repairCode = '';
  protected showUnmuteButton = true;
  protected showDisconnectButton = true;
  protected readonly localError = signal('');
  protected readonly repairError = signal('');

  protected readonly panelTitle = computed(() =>
    this.mode() === 'create' ? 'Add a screen' : 'Edit screen',
  );
  protected readonly panelSub = computed(() =>
    this.mode() === 'create'
      ? 'Pair a display with a one-time code'
      : "Update this display's details",
  );
  protected readonly submitLabel = computed(() => {
    if (this.saving()) return this.mode() === 'create' ? 'Registering…' : 'Saving…';
    return this.mode() === 'create' ? 'Register screen' : 'Save changes';
  });

  ngOnInit(): void {
    if (this.mode() === 'edit') {
      const screen = this.screen();
      if (screen) {
        this.name = screen.name;
        this.location = screen.location;
        if (PRESET_RESOLUTIONS.includes(screen.resolution)) {
          this.resolution = screen.resolution;
        } else {
          this.resolution = 'custom';
          this.customResolution = screen.resolution;
        }
        this.showUnmuteButton = screen.showUnmuteButton ?? true;
        this.showDisconnectButton = screen.showDisconnectButton ?? true;
      }
    }
  }

  onSubmit(): void {
    const resolution = this.resolution === 'custom' ? this.customResolution : this.resolution;

    if (this.mode() === 'create') {
      const pairingCode = this.pairingCode.trim();
      if (!this.name || !this.location || !resolution || !pairingCode) {
        this.localError.set('All fields are required.');
        return;
      }
      if (!/^\d{6}$/.test(pairingCode)) {
        this.localError.set('Pairing code must be 6 digits.');
        return;
      }
      this.localError.set('');
      this.create.emit({ name: this.name, location: this.location, resolution, pairingCode });
      return;
    }

    if (!this.name || !this.location || !resolution) {
      this.localError.set('All fields are required.');
      return;
    }
    this.localError.set('');
    this.update.emit({
      name: this.name,
      location: this.location,
      resolution,
      showUnmuteButton: this.showUnmuteButton,
      showDisconnectButton: this.showDisconnectButton,
    });
  }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.dismiss.emit();
    }
  }

  onRepair(): void {
    const code = this.repairCode.trim();
    if (!/^\d{6}$/.test(code)) {
      this.repairError.set('Pairing code must be 6 digits.');
      return;
    }
    this.repairError.set('');
    this.repair.emit(code);
  }
}
