import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TimeoutError, switchMap } from 'rxjs';
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
  type BackupOperation,
  type BackupOperationStep,
  type ExportedBackup,
} from './site-agent-backup.service';
import { SiteAgentBackupImportDialog } from './site-agent-backup-import-dialog';

type ExportState =
  | { step: 'working' }
  | { step: 'done'; backup: ExportedBackup }
  | { step: 'failed'; message: string };

/** The steps of each kind of operation, in order, for the progress bar. */
const OPERATION_STEPS: Record<BackupOperation['kind'], readonly BackupOperationStep[]> = {
  export: ['exporting'],
  import: [
    'waiting_for_agent',
    'waiting_for_file',
    'decrypting',
    'waiting_for_mapping',
    'applying',
  ],
};

/**
 * Backup and restore of what an agent knows about its TVs.
 *
 * Its own component because the agent page is already long, and because the
 * dialogs carry state — a password shown once, a file picked — that the page
 * has no business holding. All of the work is in the service.
 *
 * Shows any backup running on the agent, whoever started it and in whichever
 * tab, and keeps both buttons disabled until it is over: an agent runs one
 * backup operation at a time.
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
    SiteAgentBackupImportDialog,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t; prefix: 'siteAgents.backup'">
      <!-- A wrapper for the spacing: the card's host element does not take a margin. -->
      <div class="mt-4">
        <mns-card data-testid="agent-backup">
          <div class="flex flex-wrap items-center gap-4">
            <mns-icon name="Download" [size]="18" class="text-muted" />
            <div class="flex-1 min-w-[200px]">
              <div class="font-bold">{{ t('title') }}</div>
              <div class="text-[13px] text-muted">{{ t('desc') }}</div>
            </div>
            <mns-btn
              variant="outline"
              icon="Download"
              [disabled]="!canStart()"
              data-testid="backup-export"
              (mnsClick)="startExport()"
            >
              {{ t('export') }}
            </mns-btn>
            <mns-btn
              variant="outline"
              icon="Upload"
              [disabled]="!canStart()"
              data-testid="backup-import"
              (mnsClick)="importOpen.set(true)"
            >
              {{ t('import') }}
            </mns-btn>
          </div>

          @if (operation(); as op) {
            <div class="mt-4 border-t border-border pt-3" data-testid="backup-progress">
              <div class="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                <span class="font-semibold">
                  {{ t('progress.' + op.kind) }} — {{ t('progress.steps.' + op.step) }}
                </span>
                <span class="text-muted">
                  {{ t('progress.startedBy', { name: op.startedBy.name }) }}
                </span>
              </div>
              <div
                class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
                role="progressbar"
                [attr.aria-valuenow]="progressPercent(op)"
                aria-valuemin="0"
                aria-valuemax="100"
                [attr.aria-label]="t('progress.' + op.kind)"
              >
                <div
                  class="h-full rounded-full bg-accent transition-[width] duration-300"
                  [style.width.%]="progressPercent(op)"
                ></div>
              </div>
            </div>
          } @else if (!online()) {
            <p class="text-[13px] text-muted mt-3">{{ t('offlineHint') }}</p>
          }
        </mns-card>
      </div>

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

      @if (importOpen()) {
        <app-site-agent-backup-import-dialog
          [agentId]="agentId()"
          (closed)="importOpen.set(false)"
        />
      }
    </ng-container>
  `,
})
export class SiteAgentBackupPanel {
  private readonly backups = inject(SiteAgentBackupService);
  private readonly transloco = inject(TranslocoService);

  readonly agentId = input.required<string>();
  readonly agentName = input.required<string>();
  readonly online = input.required<boolean>();

  protected readonly exportState = signal<ExportState | null>(null);
  protected readonly importOpen = signal(false);

  /** Whatever backup runs on this agent right now, from any tab. */
  protected readonly operation = toSignal(
    toObservable(this.agentId).pipe(switchMap((agentId) => this.backups.operation$(agentId))),
    { initialValue: null },
  );

  protected readonly canStart = computed(
    () =>
      this.online() &&
      this.operation() === null &&
      this.exportState()?.step !== 'working' &&
      !this.importOpen(),
  );

  protected progressPercent(op: BackupOperation): number {
    const steps = OPERATION_STEPS[op.kind];
    const index = steps.indexOf(op.step);
    return Math.round(((index < 0 ? 0 : index + 1) / (steps.length + 1)) * 100);
  }

  protected async startExport(): Promise<void> {
    this.exportState.set({ step: 'working' });
    try {
      const backup = await this.backups.export(this.agentId(), this.agentName());
      this.exportState.set({ step: 'done', backup });
      this.backups.download(backup);
    } catch (error) {
      this.exportState.set({ step: 'failed', message: this.describe(error) });
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

  private describe(error: unknown): string {
    if (error instanceof BackupAgentError) {
      return error.message;
    }
    if (error instanceof TimeoutError) {
      return this.t('timeout');
    }
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return this.t('busyOrOffline');
    }
    return this.t('exportFailed');
  }

  private t(key: string): string {
    return this.transloco.translate(`siteAgents.backup.${key}`);
  }
}
