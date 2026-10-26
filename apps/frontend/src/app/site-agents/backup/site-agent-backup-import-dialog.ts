import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TimeoutError } from 'rxjs';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { LocaleDatePipe } from '../../i18n/locale-format.pipes';
import {
  BtnComponent,
  IconComponent,
  ModalComponent,
  OverlayComponent,
  SelectComponent,
  type SelectOption,
} from '../../ui';
import {
  BackupAgentError,
  SiteAgentBackupService,
  type BackupImportSummary,
  type OpenedImport,
} from './site-agent-backup.service';
import { BackupFileError, type BackupPreview } from './backup-file';
import {
  SKIP,
  entryLabel,
  groupPlan,
  mappingsOf,
  targetName,
  targetOptions,
} from './backup-mapping';

type Step = 'file' | 'password' | 'mapping' | 'result';

const STEPS: readonly Step[] = ['file', 'password', 'mapping', 'result'];

/**
 * Importing a backup as a stepper: pick the file, unlock it, decide where
 * entries the organisation no longer knows should go, see what was restored.
 *
 * Nothing is written before the last step's button: up to the mapping, the
 * file is only opened on the agent and described. Leaving at the mapping step
 * cancels the import, which frees the agent for the next one.
 */
@Component({
  selector: 'app-site-agent-backup-import-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BtnComponent,
    IconComponent,
    ModalComponent,
    OverlayComponent,
    SelectComponent,
    LocaleDatePipe,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t; prefix: 'siteAgents.backup'">
      <mns-overlay (closed)="close()">
        <mns-modal [title]="t('importTitle')" icon="Upload" [widthPx]="620" (closed)="close()">
          <ol class="mb-5 flex items-center gap-2" data-testid="backup-steps">
            @for (item of steps; track item; let i = $index) {
              <li class="flex flex-1 items-center gap-2">
                <span
                  class="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[12px] font-bold"
                  [class.bg-ok-soft]="stepState(item) === 'done'"
                  [class.text-ok]="stepState(item) === 'done'"
                  [class.bg-accent]="stepState(item) === 'current'"
                  [class.text-white]="stepState(item) === 'current'"
                  [class.bg-surface-3]="stepState(item) === 'todo'"
                  [class.text-faint]="stepState(item) === 'todo'"
                  [attr.aria-current]="stepState(item) === 'current' ? 'step' : null"
                >
                  @if (stepState(item) === 'done') {
                    <mns-icon name="Check" [size]="12" />
                  } @else {
                    {{ i + 1 }}
                  }
                </span>
                <span
                  class="text-[12px] font-semibold"
                  [class.text-accent]="stepState(item) === 'current'"
                  [class.text-muted]="stepState(item) !== 'current'"
                >
                  {{ t('steps.' + item) }}
                </span>
              </li>
            }
          </ol>

          @switch (step()) {
            @case ('file') {
              <p class="text-sm text-muted">{{ t('importIntro') }}</p>
              <input
                type="file"
                accept=".mnsbackup"
                class="mt-3 block w-full text-sm"
                data-testid="backup-file"
                (change)="pickFile($event)"
              />
              @if (preview(); as p) {
                <dl
                  class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]"
                  data-testid="backup-preview"
                >
                  <dt class="text-muted">{{ t('previewCreated') }}</dt>
                  <dd>{{ p.createdAt | localeDate: 'short' }}</dd>
                  <dt class="text-muted">{{ t('previewSource') }}</dt>
                  <dd>
                    <code class="font-mono">{{ p.sourceAgentId }}</code>
                    @if (p.sourceAgentId === agentId()) {
                      ({{ t('previewSameAgent') }})
                    }
                  </dd>
                  <dt class="text-muted">{{ t('previewScreens') }}</dt>
                  <dd>{{ p.screenCount }}</dd>
                </dl>
              }
            }
            @case ('password') {
              <label class="block text-[13px] font-bold" for="backup-password-input">
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
                [disabled]="busy()"
                (input)="password.set($any($event.target).value)"
              />
              <p class="mt-2 text-[13px] text-muted">{{ t('passwordHint') }}</p>
            }
            @case ('mapping') {
              @if (grouped(); as g) {
                <div data-testid="backup-mapping">
                  @if (g.restore.length > 0) {
                    <p class="text-[13px] font-bold">{{ t('mapping.restoreTitle') }}</p>
                    <ul class="mt-1 text-[13px] text-muted list-disc pl-5">
                      @for (entry of g.restore; track entry.screenId) {
                        <li>
                          {{ entry.screenName }}
                          @if (entry.status === 'create') {
                            — {{ t('mapping.created') }}
                          }
                        </li>
                      }
                    </ul>
                    <p class="mt-1 text-[13px] text-muted">{{ t('mergeHint') }}</p>
                  }
                  @if (g.unknown.length > 0) {
                    <p class="mt-4 text-[13px] font-bold">{{ t('mapping.unknownTitle') }}</p>
                    <p class="mt-1 text-[13px] text-muted">{{ t('mapping.unknownHint') }}</p>
                    @for (entry of g.unknown; track entry.screenId) {
                      <div
                        class="mt-3 rounded-lg border border-border p-3"
                        data-testid="backup-mapping-row"
                      >
                        <div class="text-[13px] font-semibold">{{ label(entry) }}</div>
                        <div class="mt-2">
                          <mns-select
                            [options]="optionsFor(entry.screenId)"
                            [value]="selection()[entry.screenId] ?? ''"
                            [ariaLabel]="t('mapping.selectLabel', { name: label(entry) })"
                            [disabled]="busy()"
                            (changed)="choose(entry.screenId, $event)"
                          />
                        </div>
                        @if (selection()[entry.screenId]; as to) {
                          <p
                            class="mt-2 flex items-start gap-2 text-[13px] text-warn"
                            data-testid="backup-overwrite-warning"
                          >
                            <mns-icon name="Alert" [size]="16" class="mt-0.5" />
                            <span>{{ t('mapping.overwrite', { name: nameOf(to) }) }}</span>
                          </p>
                        }
                      </div>
                    }
                  }
                  @if (g.otherAgent.length > 0) {
                    <p class="mt-4 text-[13px] font-bold">{{ t('mapping.otherAgentTitle') }}</p>
                    <ul class="mt-1 text-[13px] text-muted list-disc pl-5">
                      @for (entry of g.otherAgent; track entry.screenId) {
                        <li>
                          {{ entry.screenName }} —
                          {{ t('mapping.ownedBy', { agent: entry.ownerAgentName ?? '?' }) }}
                        </li>
                      }
                    </ul>
                  }
                </div>
              }
            }
            @case ('result') {
              @if (summary(); as s) {
                <p class="text-sm" data-testid="backup-import-done">
                  {{
                    t('importDone', {
                      screens: s.restored.length,
                      pairing: s.ssapRestored,
                      ssh: s.devmodeKeysRestored,
                    })
                  }}
                </p>
                @if (mappedCount(s) > 0) {
                  <p class="mt-2 text-[13px] text-muted">
                    {{ t('mappedCount', { count: mappedCount(s) }) }}
                  </p>
                }
                @if (s.skipped.length > 0) {
                  <p class="mt-3 text-[13px] font-bold">{{ t('skippedTitle') }}</p>
                  <ul class="mt-1 text-[13px] text-muted list-disc pl-5">
                    @for (item of s.skipped; track item.screenId) {
                      <li>
                        {{ skippedLabel(item.screenId) }} — {{ t('skipReason.' + item.reason) }}
                      </li>
                    }
                  </ul>
                }
                @if (s.staleSsapScreenIds.length > 0) {
                  <p class="mt-3 text-[13px] text-warn">
                    {{ t('stalePairing', { count: s.staleSsapScreenIds.length }) }}
                  </p>
                }
                <p class="mt-3 text-[13px] text-muted">{{ t('onboardingHint') }}</p>
              }
            }
          }

          @if (busy()) {
            <p class="mt-3 text-sm text-muted" data-testid="backup-import-working">
              {{ step() === 'mapping' ? t('applyWorking') : t('openWorking') }}
            </p>
          }
          @if (error()) {
            <p class="text-offline text-sm mt-3" data-testid="backup-import-error">
              {{ error() }}
            </p>
          }

          <div slot="footer" class="flex justify-end gap-2.5 px-6 py-5 border-t border-border">
            <mns-btn variant="outline" [disabled]="busy()" (mnsClick)="close()">
              {{ step() === 'result' ? t('close') : t('cancel') }}
            </mns-btn>
            @switch (step()) {
              @case ('file') {
                <mns-btn
                  data-testid="backup-next"
                  [disabled]="!preview()"
                  (mnsClick)="step.set('password')"
                >
                  {{ t('next') }}
                </mns-btn>
              }
              @case ('password') {
                <mns-btn
                  icon="Upload"
                  data-testid="backup-open"
                  [disabled]="busy() || password().trim().length === 0"
                  (mnsClick)="openFile()"
                >
                  {{ t('openFile') }}
                </mns-btn>
              }
              @case ('mapping') {
                <mns-btn
                  icon="Upload"
                  data-testid="backup-apply"
                  [disabled]="busy()"
                  (mnsClick)="apply()"
                >
                  {{ t('importConfirm') }}
                </mns-btn>
              }
            }
          </div>
        </mns-modal>
      </mns-overlay>
    </ng-container>
  `,
})
export class SiteAgentBackupImportDialog {
  private readonly backups = inject(SiteAgentBackupService);
  private readonly orgState = inject(OrganisationStateService);
  private readonly transloco = inject(TranslocoService);

  readonly agentId = input.required<string>();
  readonly closed = output<void>();

  protected readonly steps = STEPS;
  protected readonly step = signal<Step>('file');
  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<BackupPreview | null>(null);
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly opened = signal<OpenedImport | null>(null);
  /** Backup entry id → target screen id, or SKIP. */
  protected readonly selection = signal<Record<string, string>>({});
  protected readonly summary = signal<BackupImportSummary | null>(null);

  protected readonly grouped = computed(() => {
    const opened = this.opened();
    return opened ? groupPlan(opened.plan) : null;
  });

  protected stepState(item: Step): 'done' | 'current' | 'todo' {
    const at = STEPS.indexOf(this.step());
    const index = STEPS.indexOf(item);
    if (index < at || (item === 'result' && this.summary())) {
      return 'done';
    }
    return index === at ? 'current' : 'todo';
  }

  protected async pickFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.error.set('');
    this.preview.set(null);
    this.file.set(file);
    if (!file) {
      return;
    }
    try {
      const preview = await this.backups.preview(file);
      if (preview.organisationId !== this.orgState.selectedOrgId()) {
        this.error.set(this.t('wrongOrganisation'));
        return;
      }
      this.preview.set(preview);
    } catch (error) {
      this.error.set(this.describe(error, 'importFailed'));
    }
  }

  protected async openFile(): Promise<void> {
    const file = this.file();
    if (!file) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const opened = await this.backups.openImport(this.agentId(), file, this.password());
      this.password.set('');
      this.opened.set(opened);
      this.selection.set(
        Object.fromEntries(groupPlan(opened.plan).unknown.map((entry) => [entry.screenId, SKIP])),
      );
      this.step.set('mapping');
    } catch (error) {
      // Stays on the password step: a mistyped password is one retype away.
      this.error.set(this.describe(error, 'importFailed'));
    } finally {
      this.busy.set(false);
    }
  }

  protected optionsFor(entryId: string): SelectOption[] {
    const opened = this.opened();
    if (!opened) {
      return [];
    }
    return targetOptions(opened.plan, this.selection(), entryId, {
      skip: this.t('mapping.skip'),
      ownedBy: (agent) => this.t('mapping.ownedBy', { agent }),
      alreadyChosen: this.t('mapping.alreadyChosen'),
    });
  }

  protected choose(entryId: string, to: string): void {
    this.selection.update((current) => ({ ...current, [entryId]: to }));
  }

  protected async apply(): Promise<void> {
    const opened = this.opened();
    if (!opened) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const summary = await this.backups.applyImport(
        this.agentId(),
        opened.sessionId,
        mappingsOf(this.selection()),
      );
      this.summary.set(summary);
      this.step.set('result');
    } catch (error) {
      this.error.set(this.describe(error, 'importFailed'));
      // The session is used up either way; what is left is to start over.
      this.opened.set(null);
      this.step.set('password');
    } finally {
      this.busy.set(false);
    }
  }

  /** Leaving an opened import cancels it, so the agent is free again at once. */
  protected close(): void {
    if (this.busy()) {
      return;
    }
    const opened = this.opened();
    if (opened && this.step() === 'mapping') {
      void this.backups.cancelImport(this.agentId(), opened.sessionId);
    }
    this.closed.emit();
  }

  protected label(entry: Parameters<typeof entryLabel>[0]): string {
    return entryLabel(entry);
  }

  protected nameOf(screenId: string): string {
    const opened = this.opened();
    return opened ? targetName(opened.plan, screenId) : screenId;
  }

  protected mappedCount(summary: BackupImportSummary): number {
    return summary.restored.filter((entry) => entry.mapped).length;
  }

  /** A skipped entry by its backup name when the plan knew one. */
  protected skippedLabel(screenId: string): string {
    const entry = this.opened()?.plan.entries.find((candidate) => candidate.screenId === screenId);
    return entry ? entryLabel(entry) : screenId.slice(0, 8);
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
      return this.t('busyOrOffline');
    }
    return this.t(fallback);
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.transloco.translate(`siteAgents.backup.${key}`, params);
  }
}
