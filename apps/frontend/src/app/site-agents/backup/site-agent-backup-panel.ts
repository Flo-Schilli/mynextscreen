import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TimeoutError } from 'rxjs';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { LocaleDatePipe } from '../../i18n/locale-format.pipes';
import {
  BtnComponent,
  CardComponent,
  CopyButtonComponent,
  IconComponent,
  ModalComponent,
  OverlayComponent,
} from '../../ui';
import {
  BackupAgentError,
  SiteAgentBackupService,
  type BackupImportSummary,
  type ExportedBackup,
} from './site-agent-backup.service';
import { BackupFileError, type BackupPreview } from './backup-file';

type ExportState =
  | { step: 'working' }
  | { step: 'done'; backup: ExportedBackup }
  | { step: 'failed'; message: string };

type ImportState =
  | { step: 'choose' }
  | { step: 'ready'; file: File; preview: BackupPreview }
  | { step: 'working'; file: File; preview: BackupPreview }
  | { step: 'done'; summary: BackupImportSummary }
  | { step: 'failed'; message: string; file?: File; preview?: BackupPreview };

/**
 * Backup and restore of what an agent knows about its TVs.
 *
 * Its own component because the agent page is already long, and because the
 * two dialogs carry state — a password shown once, a file picked — that the
 * page has no business holding. All of the work is in the service.
 */
@Component({
  selector: 'app-site-agent-backup-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BtnComponent,
    CardComponent,
    CopyButtonComponent,
    IconComponent,
    ModalComponent,
    OverlayComponent,
    LocaleDatePipe,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t; prefix: 'siteAgents.backup'">
      <mns-card class="mt-4" data-testid="agent-backup">
        <div class="flex flex-wrap items-center gap-4">
          <mns-icon name="Download" [size]="18" class="text-muted" />
          <div class="flex-1 min-w-[200px]">
            <div class="font-bold">{{ t('title') }}</div>
            <div class="text-[13px] text-muted">{{ t('desc') }}</div>
          </div>
          <mns-btn
            variant="outline"
            icon="Download"
            [disabled]="!online()"
            data-testid="backup-export"
            (mnsClick)="startExport()"
          >
            {{ t('export') }}
          </mns-btn>
          <mns-btn
            variant="outline"
            icon="Upload"
            [disabled]="!online()"
            data-testid="backup-import"
            (mnsClick)="openImport()"
          >
            {{ t('import') }}
          </mns-btn>
        </div>
        @if (!online()) {
          <p class="text-[13px] text-muted mt-3">{{ t('offlineHint') }}</p>
        }
      </mns-card>

      @if (exportState(); as state) {
        <mns-overlay (closed)="closeExport()">
          <mns-modal
            [title]="t('exportTitle')"
            icon="Download"
            [widthPx]="520"
            (closed)="closeExport()"
          >
            @switch (state.step) {
              @case ('working') {
                <p class="text-sm text-muted" data-testid="backup-export-working">
                  {{ t('exportWorking') }}
                </p>
              }
              @case ('done') {
                <p class="text-sm text-muted">{{ t('passwordIntro') }}</p>
                <div
                  class="mt-3 flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 p-3"
                >
                  <code
                    class="min-w-0 flex-1 break-all font-mono text-[15px] tracking-wide"
                    data-testid="backup-password"
                    >{{ state.backup.password }}</code
                  >
                  <mns-copy-button [text]="state.backup.password" />
                </div>
                <p class="mt-3 flex items-start gap-2 text-[13px]">
                  <mns-icon name="Alert" [size]="16" class="text-warn mt-0.5" />
                  <span>{{ t('passwordWarning') }}</span>
                </p>
              }
              @case ('failed') {
                <p class="text-offline text-sm" data-testid="backup-export-error">
                  {{ state.message }}
                </p>
              }
            }
            <div slot="footer" class="flex justify-end gap-2.5 px-6 py-5 border-t border-border">
              @if (state.step === 'done') {
                <mns-btn variant="outline" icon="Download" (mnsClick)="download(state.backup)">
                  {{ t('downloadAgain') }}
                </mns-btn>
              }
              <mns-btn [disabled]="state.step === 'working'" (mnsClick)="closeExport()">
                {{ t('close') }}
              </mns-btn>
            </div>
          </mns-modal>
        </mns-overlay>
      }

      @if (importState(); as state) {
        <mns-overlay (closed)="closeImport()">
          <mns-modal
            [title]="t('importTitle')"
            icon="Upload"
            [widthPx]="560"
            (closed)="closeImport()"
          >
            @if (state.step === 'done') {
              <p class="text-sm" data-testid="backup-import-done">
                {{
                  t('importDone', {
                    screens: state.summary.restored.length,
                    pairing: state.summary.ssapRestored,
                    ssh: state.summary.devmodeKeysRestored,
                  })
                }}
              </p>
              @if (state.summary.skipped.length > 0) {
                <p class="mt-3 text-[13px] font-bold">{{ t('skippedTitle') }}</p>
                <ul class="mt-1 text-[13px] text-muted list-disc pl-5">
                  @for (item of state.summary.skipped; track item.screenId) {
                    <li>
                      <code class="font-mono">{{ item.screenId }}</code> —
                      {{ t('skipReason.' + item.reason) }}
                    </li>
                  }
                </ul>
              }
              @if (state.summary.staleSsapScreenIds.length > 0) {
                <p class="mt-3 text-[13px] text-warn">
                  {{ t('stalePairing', { count: state.summary.staleSsapScreenIds.length }) }}
                </p>
              }
            } @else {
              <p class="text-sm text-muted">{{ t('importIntro') }}</p>
              <input
                type="file"
                accept=".mnsbackup"
                class="mt-3 block w-full text-sm"
                data-testid="backup-file"
                [disabled]="state.step === 'working'"
                (change)="pickFile($event)"
              />

              @if (previewOf(state); as preview) {
                <dl
                  class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]"
                  data-testid="backup-preview"
                >
                  <dt class="text-muted">{{ t('previewCreated') }}</dt>
                  <dd>{{ preview.createdAt | localeDate: 'short' }}</dd>
                  <dt class="text-muted">{{ t('previewSource') }}</dt>
                  <dd>
                    <code class="font-mono">{{ preview.sourceAgentId }}</code>
                    @if (preview.sourceAgentId === agentId()) {
                      ({{ t('previewSameAgent') }})
                    }
                  </dd>
                  <dt class="text-muted">{{ t('previewScreens') }}</dt>
                  <dd>{{ preview.screenCount }}</dd>
                </dl>

                <label class="mt-4 block text-[13px] font-bold" for="backup-password-input">
                  {{ t('passwordLabel') }}
                </label>
                <input
                  id="backup-password-input"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
                  data-testid="backup-password-input"
                  [value]="password()"
                  [disabled]="state.step === 'working'"
                  (input)="password.set($any($event.target).value)"
                />
                <p class="mt-2 text-[13px] text-muted">{{ t('mergeHint') }}</p>
              }

              @if (state.step === 'failed') {
                <p class="text-offline text-sm mt-3" data-testid="backup-import-error">
                  {{ state.message }}
                </p>
              }
              @if (state.step === 'working') {
                <p class="text-sm text-muted mt-3">{{ t('importWorking') }}</p>
              }
            }

            <div slot="footer" class="flex justify-end gap-2.5 px-6 py-5 border-t border-border">
              <mns-btn
                variant="outline"
                [disabled]="state.step === 'working'"
                (mnsClick)="closeImport()"
              >
                {{ state.step === 'done' ? t('close') : t('cancel') }}
              </mns-btn>
              @if (state.step !== 'done') {
                <mns-btn
                  icon="Upload"
                  data-testid="backup-import-confirm"
                  [disabled]="!canImport()"
                  (mnsClick)="runImport()"
                >
                  {{ state.step === 'working' ? t('importing') : t('importConfirm') }}
                </mns-btn>
              }
            </div>
          </mns-modal>
        </mns-overlay>
      }
    </ng-container>
  `,
})
export class SiteAgentBackupPanel {
  private readonly backups = inject(SiteAgentBackupService);
  private readonly orgState = inject(OrganisationStateService);
  private readonly transloco = inject(TranslocoService);

  readonly agentId = input.required<string>();
  readonly agentName = input.required<string>();
  readonly online = input.required<boolean>();

  protected readonly exportState = signal<ExportState | null>(null);
  protected readonly importState = signal<ImportState | null>(null);
  protected readonly password = signal('');

  protected readonly canImport = computed(() => {
    const state = this.importState();
    return (
      (state?.step === 'ready' || (state?.step === 'failed' && !!state.file)) &&
      this.password().trim().length > 0
    );
  });

  protected async startExport(): Promise<void> {
    this.exportState.set({ step: 'working' });
    try {
      const backup = await this.backups.export(this.agentId(), this.agentName());
      this.exportState.set({ step: 'done', backup });
      this.backups.download(backup);
    } catch (error) {
      this.exportState.set({ step: 'failed', message: this.describe(error, 'exportFailed') });
    }
  }

  protected download(backup: ExportedBackup): void {
    this.backups.download(backup);
  }

  /** Closing drops the password from memory; it is not shown again. */
  protected closeExport(): void {
    if (this.exportState()?.step !== 'working') {
      this.exportState.set(null);
    }
  }

  protected openImport(): void {
    this.password.set('');
    this.importState.set({ step: 'choose' });
  }

  protected closeImport(): void {
    if (this.importState()?.step !== 'working') {
      this.importState.set(null);
      this.password.set('');
    }
  }

  protected async pickFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      this.importState.set({ step: 'choose' });
      return;
    }
    try {
      const preview = await this.backups.preview(file);
      if (preview.organisationId !== this.orgState.selectedOrgId()) {
        this.importState.set({ step: 'failed', message: this.t('wrongOrganisation') });
        return;
      }
      this.importState.set({ step: 'ready', file, preview });
    } catch (error) {
      this.importState.set({ step: 'failed', message: this.describe(error, 'importFailed') });
    }
  }

  protected async runImport(): Promise<void> {
    const state = this.importState();
    if (!state || !('file' in state) || !state.file || !state.preview) {
      return;
    }
    const { file, preview } = state;
    this.importState.set({ step: 'working', file, preview });
    try {
      const summary = await this.backups.import(this.agentId(), file, this.password());
      this.password.set('');
      this.importState.set({ step: 'done', summary });
    } catch (error) {
      // Keeps the file, so a mistyped password is one retype away.
      this.importState.set({
        step: 'failed',
        message: this.describe(error, 'importFailed'),
        file,
        preview,
      });
    }
  }

  protected previewOf(state: ImportState): BackupPreview | null {
    return 'preview' in state ? (state.preview ?? null) : null;
  }

  private describe(error: unknown, fallback: string): string {
    if (error instanceof BackupAgentError) {
      return error.message;
    }
    if (error instanceof BackupFileError) {
      return this.t(`file.${error.problem}`);
    }
    if (error instanceof TimeoutError) {
      return this.t('timeout');
    }
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return this.t('agentOffline');
    }
    return this.t(fallback);
  }

  private t(key: string): string {
    return this.transloco.translate(`siteAgents.backup.${key}`);
  }
}
