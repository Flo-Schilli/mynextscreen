import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { OverlayComponent, ModalComponent, IconComponent } from '../ui';

interface PlayerApp {
  slug: string;
  name: string;
  downloadAvailable: boolean;
}

/**
 * Help modal listing available native player applications.
 * Fetches the list from /api/player-apps and renders each app's markdown guide
 * (pre-converted to HTML by the backend) in a sanitized container.
 * The binary download is a plain <a download> so the browser handles the file-save
 * dialog without extra HTTP interceptor logic.
 */
@Component({
  selector: 'app-player-apps-help',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, IconComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal
        title="Player installieren"
        icon="Download"
        [widthPx]="680"
        (closed)="dismiss.emit()"
      >
        @if (loading()) {
          <div class="flex items-center justify-center py-12 text-muted text-sm">
            Lade Player-Apps…
          </div>
        } @else if (loadError()) {
          <div
            class="rounded-xl border border-offline-dim bg-offline-dim/30 px-5 py-4 text-sm text-offline"
          >
            {{ loadError() }}
          </div>
        } @else if (!selectedApp()) {
          <!-- App list -->
          <div class="flex flex-col gap-3">
            <p class="text-sm text-muted mb-1">
              Wähle eine Plattform für die Installationsanleitung und den Download.
            </p>
            @for (app of apps(); track app.slug) {
              <button
                type="button"
                class="flex items-center gap-4 rounded-xl border border-border bg-surface-raised px-5 py-4 text-left transition-colors duration-[120ms] hover:border-accent hover:bg-accent-soft cursor-pointer"
                (click)="selectApp(app)"
              >
                <div
                  class="w-10 h-10 rounded-[10px] bg-accent-soft text-accent grid place-items-center flex-shrink-0"
                >
                  <mns-icon name="Screens" [size]="20" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-sm">{{ app.name }}</p>
                  <p class="text-xs text-muted mt-0.5">
                    @if (app.downloadAvailable) {
                      Anleitung + IPK-Binary verfügbar
                    } @else {
                      Anleitung verfügbar
                    }
                  </p>
                </div>
                <mns-icon
                  name="ChevronLeft"
                  [size]="16"
                  class="text-muted"
                  style="transform: rotate(180deg)"
                />
              </button>
            }
          </div>
        } @else {
          <!-- App detail: guide + download -->
          <div class="flex flex-col gap-4">
            <!-- Back + download row -->
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors duration-[120ms]"
                (click)="clearApp()"
              >
                <mns-icon name="ChevronLeft" [size]="12" />
                Alle Plattformen
              </button>
              <span class="flex-1"></span>
              @if (selectedApp()!.downloadAvailable) {
                <a
                  [href]="'/api/player-apps/' + selectedApp()!.slug + '/download'"
                  download
                  class="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <mns-icon name="Download" [size]="13" />
                  IPK herunterladen
                </a>
              }
            </div>

            <!-- Guide content -->
            @if (guideLoading()) {
              <div class="flex items-center justify-center py-10 text-muted text-sm">
                Lade Anleitung…
              </div>
            } @else if (guideError()) {
              <div
                class="rounded-xl border border-offline-dim bg-offline-dim/30 px-5 py-4 text-sm text-offline"
              >
                {{ guideError() }}
              </div>
            } @else {
              <div class="player-guide" [innerHTML]="safeGuideHtml()"></div>
            }
          </div>
        }
      </mns-modal>
    </mns-overlay>
  `,
})
export class PlayerAppsHelp {
  readonly dismiss = output<void>();

  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly apps = signal<PlayerApp[]>([]);

  readonly selectedApp = signal<PlayerApp | null>(null);
  readonly guideLoading = signal(false);
  readonly guideError = signal('');
  readonly safeGuideHtml = signal('');

  constructor() {
    this.loadApps();
  }

  private loadApps(): void {
    this.http.get<PlayerApp[]>('/api/player-apps').subscribe({
      next: (apps) => {
        this.apps.set(apps);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Player-Apps konnten nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  selectApp(app: PlayerApp): void {
    this.selectedApp.set(app);
    this.guideLoading.set(true);
    this.guideError.set('');
    this.safeGuideHtml.set('');

    this.http.get(`/api/player-apps/${app.slug}/guide`, { responseType: 'text' }).subscribe({
      next: (html) => {
        const safe = this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
        this.safeGuideHtml.set(safe);
        this.guideLoading.set(false);
      },
      error: () => {
        this.guideError.set('Anleitung konnte nicht geladen werden.');
        this.guideLoading.set(false);
      },
    });
  }

  clearApp(): void {
    this.selectedApp.set(null);
    this.safeGuideHtml.set('');
    this.guideError.set('');
  }
}
