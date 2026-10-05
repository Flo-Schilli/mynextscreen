import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Subject, takeUntil } from 'rxjs';
import { SiteAgentService } from './site-agent.service';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { ToastService } from '../shared/toast/toast.service';
import type {
  ScreenRemoteControl,
  SiteAgentListItem,
  UpdateScreenRemoteControlRequest,
} from './site-agent.model';
import type { ScreenListItem } from '../screens/screen.model';
import {
  BtnComponent,
  IconComponent,
  ModalComponent,
  OverlayComponent,
  SFieldComponent,
  SInputComponent,
  SelectComponent,
} from '../ui';

/** How long to wait for the agent's answer before saying it did not come. */
const CHECK_TIMEOUT_MS = 20_000;

/** Fields a step asks for, so the operator never leaves the wizard to set them. */
type StepField = 'agent' | 'address' | 'passphrase';

interface WizardStep {
  step: number;
  fields: StepField[];
  /** Whether the agent verifies this step by talking to the TV. */
  checkable: boolean;
  /**
   * Optional steps may be skipped. Only the Developer Mode chain is: it exists
   * solely so the agent can keep the session from expiring, and an installation
   * that does not want that does not need any of it.
   *
   * Display strings (title/short/instruction) live in the translation files
   * under `siteAgents.wizard.steps.<step>.*`, keyed by step number.
   */
  optional: boolean;
}

const STEPS: WizardStep[] = [
  { step: 1, fields: ['agent'], checkable: false, optional: false },
  { step: 2, fields: ['address'], checkable: true, optional: false },
  { step: 3, fields: [], checkable: false, optional: true },
  { step: 4, fields: [], checkable: true, optional: true },
  { step: 5, fields: ['passphrase'], checkable: true, optional: true },
  { step: 6, fields: [], checkable: true, optional: true },
  { step: 7, fields: [], checkable: true, optional: false },
  { step: 8, fields: [], checkable: true, optional: false },
  { step: 9, fields: [], checkable: true, optional: false },
];

/** How many steps the wizard has, for anything outside it that counts them. */
export const ONBOARDING_STEP_COUNT = STEPS.length;

/** Skipping the first Developer Mode step makes the rest of that chain moot. */
const DEVMODE_CHAIN_END = 6;

@Component({
  selector: 'app-screen-onboarding-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BtnComponent,
    IconComponent,
    ModalComponent,
    OverlayComponent,
    SFieldComponent,
    SInputComponent,
    SelectComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="closed.emit()" *transloco="let t">
      <mns-modal
        [title]="screen().name"
        [sub]="t('siteAgents.wizard.sub')"
        icon="Cast"
        [widthPx]="880"
        (closed)="closed.emit()"
      >
        <div class="grid gap-6 sm:grid-cols-[232px_1fr]">
          <!-- The steps, as a menu -->
          <ol class="flex flex-col gap-1 sm:border-r sm:border-border sm:pr-4">
            @for (item of steps; track item.step) {
              <li>
                <button
                  type="button"
                  class="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
                  [class.bg-accent-soft]="item.step === current()"
                  [class.cursor-default]="isLocked(item)"
                  [class.opacity-45]="isLocked(item)"
                  [class.hover:bg-hover]="!isLocked(item) && item.step !== current()"
                  [disabled]="isLocked(item)"
                  (click)="goTo(item)"
                >
                  <span
                    class="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold"
                    [class.bg-ok-soft]="state(item) === 'done'"
                    [class.text-ok]="state(item) === 'done'"
                    [class.bg-surface-3]="state(item) === 'skipped'"
                    [class.text-muted]="state(item) === 'skipped'"
                    [class.bg-accent]="state(item) === 'current'"
                    [class.text-white]="state(item) === 'current'"
                    [class.bg-surface-3]="state(item) === 'todo'"
                    [class.text-faint]="state(item) === 'todo'"
                  >
                    @if (state(item) === 'done') {
                      <mns-icon name="Check" [size]="12" />
                    } @else {
                      {{ item.step }}
                    }
                  </span>
                  <span class="min-w-0 flex-1">
                    <span
                      class="block text-[13px] font-semibold leading-tight"
                      [class.text-accent]="item.step === current()"
                    >
                      {{ t('siteAgents.wizard.steps.' + item.step + '.short') }}
                    </span>
                    <span class="block text-[11px] text-muted leading-tight mt-0.5">
                      {{ stateLabel(item) }}
                    </span>
                  </span>
                </button>
              </li>
            }
          </ol>

          <!-- The step itself -->
          @if (step(); as item) {
            <div class="min-w-0">
              <h3 class="text-[15px] font-bold">
                {{ t('siteAgents.wizard.steps.' + item.step + '.title') }}
              </h3>
              <p class="mt-1.5 whitespace-pre-line text-[13px] text-muted">
                {{ t('siteAgents.wizard.steps.' + item.step + '.instruction') }}
              </p>

              <div class="mt-4 flex flex-col gap-4">
                @if (item.fields.includes('agent')) {
                  <mns-sfield [label]="t('siteAgents.wizard.agentLabel')">
                    <mns-select
                      [options]="agentOptions()"
                      [(value)]="agentId"
                      [placeholder]="t('siteAgents.wizard.agentPlaceholder')"
                    />
                  </mns-sfield>
                }

                @if (item.fields.includes('address')) {
                  <mns-sfield
                    [label]="t('siteAgents.wizard.ipLabel')"
                    [hint]="t('siteAgents.wizard.ipHint')"
                  >
                    <mns-sinput [(value)]="localIp" [mono]="true" placeholder="192.168.1.50" />
                  </mns-sfield>
                  <mns-sfield
                    [label]="t('siteAgents.wizard.macLabel')"
                    [hint]="t('siteAgents.wizard.macHint')"
                  >
                    <mns-sinput
                      [(value)]="macAddress"
                      [mono]="true"
                      placeholder="AA:BB:CC:DD:EE:FF"
                    />
                  </mns-sfield>
                }

                @if (item.fields.includes('passphrase')) {
                  <mns-sfield
                    [label]="t('siteAgents.wizard.passphraseLabel')"
                    [hint]="
                      hasPassphrase()
                        ? t('siteAgents.wizard.passphraseHintSaved')
                        : t('siteAgents.wizard.passphraseHintEmpty')
                    "
                  >
                    <mns-sinput
                      [(value)]="passphrase"
                      [mono]="true"
                      [placeholder]="hasPassphrase() ? '••••••••' : 'AEBC72'"
                    />
                  </mns-sfield>
                }
              </div>

              @if (result(); as outcome) {
                <p
                  class="mt-4 text-[13px]"
                  [class.text-offline]="!outcome.ok"
                  [class.text-ok]="outcome.ok"
                >
                  {{
                    outcome.ok
                      ? t('siteAgents.wizard.resultOk')
                      : outcome.detail || t('siteAgents.wizard.resultFailFallback')
                  }}
                </p>
              }

              <div class="mt-5 flex flex-wrap gap-2">
                <mns-btn [disabled]="busy() || !canAdvance(item)" (mnsClick)="advance(item)">
                  {{ actionLabel(item) }}
                </mns-btn>
                @if (item.optional) {
                  <mns-btn variant="outline" [disabled]="busy()" (mnsClick)="skip(item)">
                    {{ t('siteAgents.wizard.skip') }}
                  </mns-btn>
                }
                @if (item.step > 1) {
                  <mns-btn variant="outline" [disabled]="busy()" (mnsClick)="back()">
                    {{ t('siteAgents.wizard.back') }}
                  </mns-btn>
                }
              </div>
            </div>
          }
        </div>

        <div
          slot="footer"
          class="flex items-center justify-between gap-3 px-6 py-5 border-t border-border"
        >
          <span class="text-[13px] text-muted">
            @if (completed()) {
              {{ t('siteAgents.wizard.completedNote') }}
            } @else {
              {{ t('siteAgents.wizard.stepCounter', { current: current(), total: steps.length }) }}
            }
          </span>
          <mns-btn variant="outline" (mnsClick)="closed.emit()">
            {{ t('siteAgents.wizard.close') }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
  host: { style: 'display:contents' },
})
export class ScreenOnboardingWizard implements OnInit, OnDestroy {
  private readonly service = inject(SiteAgentService);
  private readonly sse = inject(DashboardSseService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyed$ = new Subject<void>();

  readonly screen = input.required<ScreenListItem>();
  readonly remote = input.required<ScreenRemoteControl>();
  readonly closed = output<void>();
  readonly changed = output<void>();

  protected readonly steps = STEPS;
  protected readonly current = signal(1);
  /**
   * Whether the wizard is finished.
   *
   * Needed as its own flag because the step number cannot express it: the last
   * step can never be "past", so deriving Done from the step alone left the
   * final one reading "In progress" after it had passed.
   */
  protected readonly completed = signal(false);
  protected readonly busy = signal(false);
  protected readonly result = signal<{ ok: boolean; detail: string | null } | null>(null);
  protected readonly agentOptions = signal<{ value: string; label: string }[]>([]);
  protected readonly hasPassphrase = signal(false);

  /** How far the operator has actually got; steps beyond it stay locked. */
  private readonly reached = signal(1);
  private readonly skipped = signal<Set<number>>(new Set());

  protected readonly agentId = signal('');
  protected readonly localIp = signal('');
  protected readonly macAddress = signal('');
  protected readonly passphrase = signal('');

  protected readonly step = computed(
    () => STEPS.find((s) => s.step === this.current()) ?? STEPS[0],
  );

  /** The check this wizard is waiting on, so another tab's result is ignored. */
  private pendingCommandId: string | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const remote = this.remote();
    this.current.set(remote.onboardingStep);
    this.reached.set(remote.onboardingStep);
    this.completed.set(remote.onboardingCompletedAt !== null);
    this.agentId.set(remote.agentId ?? '');
    this.localIp.set(remote.localIp ?? '');
    this.macAddress.set(remote.macAddress ?? '');
    this.hasPassphrase.set(remote.devmodePassphrase !== null);

    this.service.getAll().subscribe({
      next: (agents: SiteAgentListItem[]) =>
        this.agentOptions.set(agents.map((a) => ({ value: a.id, label: a.name }))),
      error: () => this.toast.error(this.transloco.translate('siteAgents.wizard.loadAgentsFailed')),
    });

    // The answer arrives on the stream the dashboard already holds open, not on
    // the response to the check — nothing waits on a round trip to the venue.
    this.sse.screenOnboardingCheck$.pipe(takeUntil(this.destroyed$)).subscribe((event) => {
      const data = event.data as {
        screenId: string;
        commandId: string | null;
        step: number;
        ok: boolean;
        detail: string | null;
      };
      if (data.screenId !== this.screen().id || data.commandId !== this.pendingCommandId) {
        return;
      }

      this.settle();
      this.result.set({ ok: data.ok, detail: data.detail });
      if (data.ok) {
        if (data.step >= STEPS.length) {
          this.completed.set(true);
        }
        this.moveTo(data.step + 1);
        this.changed.emit();
      }
    });
  }

  ngOnDestroy(): void {
    this.settle();
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  protected state(item: WizardStep): 'done' | 'current' | 'skipped' | 'todo' {
    if (this.skipped().has(item.step)) return 'skipped';
    if (this.completed()) return 'done';
    if (item.step === this.current()) return 'current';
    return item.step < this.reached() ? 'done' : 'todo';
  }

  protected stateLabel(item: WizardStep): string {
    switch (this.state(item)) {
      case 'done':
        return this.transloco.translate('siteAgents.wizard.stateDone');
      case 'skipped':
        return this.transloco.translate('siteAgents.wizard.stateSkipped');
      case 'current':
        return this.transloco.translate('siteAgents.wizard.stateInProgress');
      default:
        return this.transloco.translate(
          item.optional ? 'siteAgents.wizard.stateOptional' : 'siteAgents.wizard.stateNotYet',
        );
    }
  }

  /**
   * A step beyond the furthest one reached cannot be opened. Steps already
   * passed can, so a setting can be corrected without starting over.
   */
  protected isLocked(item: WizardStep): boolean {
    return item.step > this.reached();
  }

  protected goTo(item: WizardStep): void {
    if (this.isLocked(item) || item.step === this.current()) {
      return;
    }
    this.result.set(null);
    this.current.set(item.step);
  }

  protected canAdvance(item: WizardStep): boolean {
    if (item.fields.includes('agent')) return this.agentId() !== '';
    if (item.fields.includes('address')) return this.localIp().trim() !== '';
    if (item.fields.includes('passphrase')) return this.hasPassphrase() || this.passphrase() !== '';
    return true;
  }

  protected actionLabel(item: WizardStep): string {
    if (this.busy()) {
      return this.transloco.translate(
        item.checkable ? 'siteAgents.wizard.actionChecking' : 'siteAgents.wizard.actionSaving',
      );
    }
    if (item.fields.length > 0) {
      return this.transloco.translate(
        item.checkable
          ? 'siteAgents.wizard.actionSaveCheck'
          : 'siteAgents.wizard.actionSaveContinue',
      );
    }
    return this.transloco.translate(
      item.checkable ? 'siteAgents.wizard.actionCheck' : 'siteAgents.wizard.actionDoneNext',
    );
  }

  /** Saves whatever this step collected, then checks it if the agent can. */
  protected advance(item: WizardStep): void {
    this.result.set(null);
    const payload = this.payloadFor(item);

    if (Object.keys(payload).length === 0) {
      this.afterSave(item);
      return;
    }

    this.busy.set(true);
    this.service.updateRemoteControl(this.screen().id, payload).subscribe({
      next: () => {
        this.busy.set(false);
        if (payload.devmodePassphrase) {
          this.hasPassphrase.set(true);
          this.passphrase.set('');
        }
        this.changed.emit();
        this.afterSave(item);
      },
      error: (error: { error?: { message?: string } }) => {
        this.busy.set(false);
        this.result.set({
          ok: false,
          detail: error.error?.message ?? this.transloco.translate('siteAgents.wizard.saveFailed'),
        });
      },
    });
  }

  /**
   * Skipping the first Developer Mode step takes the whole chain with it: the
   * three after it only make sense once that app is installed.
   */
  protected skip(item: WizardStep): void {
    this.result.set(null);
    const chain = item.step === 3 ? [3, 4, 5, 6] : [item.step];
    this.skipped.update((set) => new Set([...set, ...chain]));
    this.moveTo(item.step === 3 ? DEVMODE_CHAIN_END + 1 : item.step + 1);
  }

  protected back(): void {
    this.result.set(null);
    this.current.update((step) => Math.max(step - 1, 1));
  }

  private afterSave(item: WizardStep): void {
    if (!item.checkable) {
      this.moveTo(item.step + 1);
      return;
    }
    this.runCheck(item.step);
  }

  private payloadFor(item: WizardStep): UpdateScreenRemoteControlRequest {
    const payload: UpdateScreenRemoteControlRequest = {};
    if (item.fields.includes('agent') && this.agentId()) {
      payload.agentId = this.agentId();
    }
    if (item.fields.includes('address')) {
      payload.localIp = this.localIp().trim() || null;
      payload.macAddress = this.macAddress().trim() || null;
    }
    // Blank means keep, exactly as the settings dialog treats it.
    if (item.fields.includes('passphrase') && this.passphrase()) {
      payload.devmodePassphrase = this.passphrase();
    }
    return payload;
  }

  private runCheck(step: number): void {
    this.busy.set(true);
    this.service.runCheck(this.screen().id, step).subscribe({
      next: ({ commandId }) => {
        this.pendingCommandId = commandId;
        this.timeout = setTimeout(() => {
          this.settle();
          this.result.set({
            ok: false,
            detail: this.transloco.translate('siteAgents.wizard.noAnswer'),
          });
        }, CHECK_TIMEOUT_MS);
      },
      error: (error: { status?: number }) => {
        this.settle();
        this.result.set({
          ok: false,
          detail: this.transloco.translate(
            error.status === 409
              ? 'siteAgents.wizard.agentOffline'
              : 'siteAgents.wizard.agentUnreachable',
          ),
        });
      },
    });
  }

  private moveTo(step: number): void {
    const next = Math.min(step, STEPS.length);
    this.current.set(next);
    this.reached.update((furthest) => Math.max(furthest, next));
  }

  private settle(): void {
    this.busy.set(false);
    this.pendingCommandId = null;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
