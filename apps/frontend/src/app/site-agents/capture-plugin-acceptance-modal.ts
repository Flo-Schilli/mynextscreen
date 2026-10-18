import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { BtnComponent, ModalComponent, OverlayComponent } from '../ui';
import { ToastService } from '../shared/toast/toast.service';
import { CapturePluginService } from './capture-plugin.service';
import type { CapturePluginLicenseText } from './site-agent.model';

const NDI_HOME_URL = 'https://ndi.video';
/** Pixels of slack, so a fractional scroll position still counts as the end. */
const SCROLL_END_TOLERANCE_PX = 4;
const SHORT_HASH_LENGTH = 12;

type Pane = 'ndi' | 'terms';

/**
 * Acceptance dialog for the video capture plugin's license.
 *
 * Shows the NDI SDK license and the plugin terms in two panes. Accepting is
 * possible only after both have been scrolled to the end and the box is ticked.
 * The POST carries the hash of the text that was loaded, so a license that
 * changes while the dialog is open is rejected (409) rather than accepted
 * unseen; the dialog then reloads the text and starts over.
 */
@Component({
  selector: 'app-capture-plugin-acceptance-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent, TranslocoDirective],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal
        [title]="t('siteAgents.capture.modal.title')"
        icon="Lock"
        [widthPx]="760"
        (closed)="dismiss.emit()"
      >
        @if (loading()) {
          <p class="text-sm text-muted" data-testid="license-loading">
            {{ t('siteAgents.capture.modal.loading') }}
          </p>
        } @else if (text(); as lic) {
          <div class="flex flex-col gap-4">
            <section>
              <h3 class="mb-1.5 text-[13px] font-bold">
                {{ t('siteAgents.capture.modal.ndiLicenseHeading') }}
              </h3>
              <pre
                #pane
                data-pane="ndi"
                data-testid="pane-ndi"
                tabindex="0"
                class="license-pane"
                [attr.aria-label]="t('siteAgents.capture.modal.ndiLicenseHeading')"
                (scroll)="onScroll('ndi', $event)"
                >{{ lic.ndiLicenseText }}</pre>
            </section>
            <section>
              <h3 class="mb-1.5 text-[13px] font-bold">
                {{ t('siteAgents.capture.modal.termsHeading') }}
              </h3>
              <pre
                #pane
                data-pane="terms"
                data-testid="pane-terms"
                tabindex="0"
                class="license-pane"
                [attr.aria-label]="t('siteAgents.capture.modal.termsHeading')"
                (scroll)="onScroll('terms', $event)"
                >{{ lic.termsText }}</pre>
            </section>

            <p class="m-0 text-[11px] text-muted">
              {{ t('siteAgents.capture.trademark') }}
              <a class="underline" [href]="ndiHomeUrl" target="_blank" rel="noopener noreferrer"
                >ndi.video</a
              >
              ·
              <span [attr.title]="lic.licenseSha256" data-testid="license-hash">
                {{ t('siteAgents.capture.modal.hash') }}
                <code class="font-mono">{{ shortHash() }}</code>
              </span>
            </p>

            @if (!bothRead()) {
              <p class="m-0 text-[13px] text-warn" data-testid="scroll-hint">
                {{ t('siteAgents.capture.modal.scrollHint') }}
              </p>
            }

            <label class="flex items-start gap-2.5 text-sm" data-testid="accept-label">
              <input
                type="checkbox"
                class="mt-0.5 h-4 w-4 cursor-pointer"
                data-testid="accept-checkbox"
                [checked]="checked()"
                (change)="onToggle($event)"
              />
              <span>{{
                t('siteAgents.capture.modal.checkbox', { organisation: organisation() })
              }}</span>
            </label>
          </div>
        } @else {
          <p class="text-sm text-offline" data-testid="license-error">
            {{ loadError() }}
          </p>
        }

        <div slot="footer" class="flex justify-end gap-2.5 px-6 py-5 border-t border-border">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">
            {{ t('common.actions.cancel') }}
          </mns-btn>
          <mns-btn
            icon="Check"
            data-testid="accept-button"
            [disabled]="!canAccept()"
            (mnsClick)="accept()"
          >
            {{
              busy()
                ? t('siteAgents.capture.modal.accepting')
                : t('siteAgents.capture.modal.accept')
            }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
  styles: `
    .license-pane {
      margin: 0;
      max-height: 11rem;
      overflow-y: auto;
      padding: 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--border-strong);
      background: var(--surface-2);
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.75rem;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
})
export class CapturePluginAcceptanceModal implements OnInit {
  readonly agentId = input.required<string>();
  readonly organisation = input<string>('');

  /** The user accepted; the card refreshes its status. */
  readonly accepted = output<void>();
  /** The license changed under the dialog; the card refreshes its status. */
  readonly stale = output<void>();
  readonly dismiss = output<void>();

  private readonly service = inject(CapturePluginService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly panes = viewChildren<ElementRef<HTMLElement>>('pane');

  protected readonly ndiHomeUrl = NDI_HOME_URL;
  protected readonly text = signal<CapturePluginLicenseText | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly busy = signal(false);
  protected readonly checked = signal(false);
  private readonly read = signal<Readonly<Record<Pane, boolean>>>({ ndi: false, terms: false });

  protected readonly bothRead = computed(() => this.read().ndi && this.read().terms);
  protected readonly canAccept = computed(
    () => this.text() !== null && this.bothRead() && this.checked() && !this.busy(),
  );
  protected readonly shortHash = computed(
    () => this.text()?.licenseSha256.slice(0, SHORT_HASH_LENGTH) ?? '',
  );

  constructor() {
    // A text short enough to fit has nothing to scroll to; it counts as read.
    // Runs whenever the panes (re)appear, i.e. after each successful load.
    effect(() => this.checkAllPanes());
  }

  ngOnInit(): void {
    this.load();
  }

  protected onScroll(pane: Pane, event: Event): void {
    this.markIfAtEnd(pane, event.target as HTMLElement);
  }

  protected onToggle(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }

  protected accept(): void {
    const lic = this.text();
    if (!lic || !this.canAccept()) return;
    this.busy.set(true);
    this.service.accept(this.agentId(), lic.licenseSha256).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(this.transloco.translate('siteAgents.capture.toast.accepted'));
        this.accepted.emit();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.onAcceptError(err);
      },
    });
  }

  private onAcceptError(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      const key =
        err.error?.error === 'license_text_missing' || err.error?.message === 'license_text_missing'
          ? 'siteAgents.capture.toast.textMissing'
          : 'siteAgents.capture.toast.licenseChanged';
      this.toast.error(this.transloco.translate(key));
      this.stale.emit();
      this.load();
      return;
    }
    this.toast.error(this.transloco.translate('siteAgents.capture.toast.acceptFailed'));
  }

  /** (Re)loads the text and forgets any reading progress made on a previous version. */
  private load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.text.set(null);
    this.checked.set(false);
    this.read.set({ ndi: false, terms: false });
    this.service.getLicenseText(this.agentId()).subscribe({
      next: (text) => {
        this.text.set(text);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const missing = err instanceof HttpErrorResponse && err.status === 404;
        this.loadError.set(
          this.transloco.translate(
            missing
              ? 'siteAgents.capture.modal.notAvailable'
              : 'siteAgents.capture.modal.loadFailed',
          ),
        );
      },
    });
  }

  private checkAllPanes(): void {
    for (const ref of this.panes()) {
      const pane = ref.nativeElement.dataset['pane'] as Pane | undefined;
      if (pane) this.markIfAtEnd(pane, ref.nativeElement);
    }
  }

  private markIfAtEnd(pane: Pane, el: HTMLElement): void {
    // A pane that is not laid out yet (hidden, or not rendered) measures 0 and
    // would pass the arithmetic below; it has not been read.
    if (el.clientHeight <= 0 || el.scrollHeight <= 0) {
      return;
    }
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_END_TOLERANCE_PX;
    if (atEnd && !this.read()[pane]) {
      this.read.update((r) => ({ ...r, [pane]: true }));
    }
  }
}
