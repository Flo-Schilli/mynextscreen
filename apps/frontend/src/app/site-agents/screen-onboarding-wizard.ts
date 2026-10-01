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
  title: string;
  /** Shown in the left-hand list under the title. */
  short: string;
  /** What the operator does, in the right-hand pane. */
  instruction: string;
  fields: StepField[];
  /** Whether the agent verifies this step by talking to the TV. */
  checkable: boolean;
  /**
   * Optional steps may be skipped. Only the Developer Mode chain is: it exists
   * solely so the agent can keep the session from expiring, and an installation
   * that does not want that does not need any of it.
   */
  optional: boolean;
}

const STEPS: WizardStep[] = [
  {
    step: 1,
    title: 'Pick the agent',
    short: 'Agent',
    instruction:
      'Which agent in this venue should look after the display. Without one, nothing below can run.',
    fields: ['agent'],
    checkable: false,
    optional: false,
  },
  {
    step: 2,
    title: 'Address on the venue network',
    short: 'Network',
    instruction:
      "The TV's IP address, from Settings → Network on the set. The MAC address is only needed if the agent should wake it before a schedule; wired and wireless have different ones.",
    fields: ['address'],
    checkable: true,
    optional: false,
  },
  {
    step: 3,
    title: 'Install the Developer Mode app',
    short: 'Developer Mode',
    instruction:
      'On the TV: sign in with an LG account, install "Developer Mode" from the Content Store, open it and switch Dev Mode Status on. The set restarts.\n\nThis and the three steps after it exist so the agent can keep the session from expiring — when it does, the TV deletes the app. Skip them and the display still works, but someone has to extend it by hand.',
    fields: [],
    checkable: false,
    optional: true,
  },
  {
    step: 4,
    title: 'Switch the key server on',
    short: 'Key server',
    instruction: 'In the Developer Mode app on the TV, turn on "Key Server".',
    fields: [],
    checkable: true,
    optional: true,
  },
  {
    step: 5,
    title: 'Enter the passphrase',
    short: 'Passphrase',
    instruction:
      'The six characters the Developer Mode app shows as the passphrase. It derives from the set itself and does not change when Developer Mode is switched on again.',
    fields: ['passphrase'],
    checkable: true,
    optional: true,
  },
  {
    step: 6,
    title: 'Check the connection to the TV',
    short: 'SSH',
    instruction:
      'Nothing to do here — the agent connects with the key it fetched and reports back.',
    fields: [],
    checkable: true,
    optional: true,
  },
  {
    step: 7,
    title: 'Confirm the pairing prompt',
    short: 'Pairing',
    instruction:
      'The TV shows a prompt asking to allow the connection. Confirm it with the remote. This is needed once per display, and nobody can do it from here.',
    fields: [],
    checkable: true,
    optional: false,
  },
  {
    step: 8,
    title: 'Start the app',
    short: 'Finish',
    instruction:
      'The agent starts the player and, if Developer Mode is set up, extends the session.',
    fields: [],
    checkable: true,
    optional: false,
  },
];

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
  ],
  template: `
    <mns-overlay (closed)="closed.emit()">
      <mns-modal
        [title]="screen().name"
        sub="Connect this display"
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
                      {{ item.short }}
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
              <h3 class="text-[15px] font-bold">{{ item.title }}</h3>
              <p class="mt-1.5 whitespace-pre-line text-[13px] text-muted">
                {{ item.instruction }}
              </p>

              <div class="mt-4 flex flex-col gap-4">
                @if (item.fields.includes('agent')) {
                  <mns-sfield label="Site agent">
                    <mns-select
                      [options]="agentOptions()"
                      [(value)]="agentId"
                      placeholder="Pick an agent"
                    />
                  </mns-sfield>
                }

                @if (item.fields.includes('address')) {
                  <mns-sfield label="IP address" hint="e.g. 192.168.1.50">
                    <mns-sinput [(value)]="localIp" [mono]="true" placeholder="192.168.1.50" />
                  </mns-sfield>
                  <mns-sfield label="MAC address" hint="Optional — only for Wake-on-LAN">
                    <mns-sinput
                      [(value)]="macAddress"
                      [mono]="true"
                      placeholder="AA:BB:CC:DD:EE:FF"
                    />
                  </mns-sfield>
                }

                @if (item.fields.includes('passphrase')) {
                  <mns-sfield
                    label="Developer mode passphrase"
                    [hint]="hasPassphrase() ? 'Saved — leave blank to keep it' : 'Six characters'"
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
                  {{ outcome.ok ? 'Looks good.' : outcome.detail || 'That did not work.' }}
                </p>
              }

              <div class="mt-5 flex flex-wrap gap-2">
                <mns-btn [disabled]="busy() || !canAdvance(item)" (mnsClick)="advance(item)">
                  {{ actionLabel(item) }}
                </mns-btn>
                @if (item.optional) {
                  <mns-btn variant="outline" [disabled]="busy()" (mnsClick)="skip(item)">
                    Skip
                  </mns-btn>
                }
                @if (item.step > 1) {
                  <mns-btn variant="outline" [disabled]="busy()" (mnsClick)="back()">Back</mns-btn>
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
            @if (remote().onboardingCompletedAt) {
              This display is set up. Re-run any step if something changes on the TV.
            } @else {
              Step {{ current() }} of {{ steps.length }}
            }
          </span>
          <mns-btn variant="outline" (mnsClick)="closed.emit()">Close</mns-btn>
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
  private readonly destroyed$ = new Subject<void>();

  readonly screen = input.required<ScreenListItem>();
  readonly remote = input.required<ScreenRemoteControl>();
  readonly closed = output<void>();
  readonly changed = output<void>();

  protected readonly steps = STEPS;
  protected readonly current = signal(1);
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
    this.agentId.set(remote.agentId ?? '');
    this.localIp.set(remote.localIp ?? '');
    this.macAddress.set(remote.macAddress ?? '');
    this.hasPassphrase.set(remote.devmodePassphrase !== null);

    this.service.getAll().subscribe({
      next: (agents: SiteAgentListItem[]) =>
        this.agentOptions.set(agents.map((a) => ({ value: a.id, label: a.name }))),
      error: () => this.toast.error('Could not load the site agents'),
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
    if (item.step === this.current()) return 'current';
    return item.step < this.reached() ? 'done' : 'todo';
  }

  protected stateLabel(item: WizardStep): string {
    switch (this.state(item)) {
      case 'done':
        return 'Done';
      case 'skipped':
        return 'Skipped';
      case 'current':
        return 'In progress';
      default:
        return item.optional ? 'Optional' : 'Not yet';
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
    if (this.busy()) return item.checkable ? 'Checking…' : 'Saving…';
    if (item.fields.length > 0) return item.checkable ? 'Save and check' : 'Save and continue';
    return item.checkable ? 'Check' : 'Done, next';
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
        this.result.set({ ok: false, detail: error.error?.message ?? 'Could not save that.' });
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
          this.result.set({ ok: false, detail: 'The agent did not answer.' });
        }, CHECK_TIMEOUT_MS);
      },
      error: (error: { status?: number }) => {
        this.settle();
        this.result.set({
          ok: false,
          detail:
            error.status === 409
              ? 'The agent is not connected right now.'
              : 'Could not reach the agent.',
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
