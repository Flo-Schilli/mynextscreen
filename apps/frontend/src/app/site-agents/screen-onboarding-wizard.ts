import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SiteAgentService } from './site-agent.service';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { ToastService } from '../shared/toast/toast.service';
import type { ScreenRemoteControl } from './site-agent.model';
import type { ScreenListItem } from '../screens/screen.model';
import { BtnComponent, IconComponent, ModalComponent, OverlayComponent } from '../ui';

/** How long to wait for the agent's answer before saying it did not come. */
const CHECK_TIMEOUT_MS = 20_000;

interface WizardStep {
  step: number;
  title: string;
  /** What the operator does; empty when the agent does all of it. */
  instruction: string;
  /** Whether this step is verified by asking the agent. */
  checkable: boolean;
}

/**
 * Steps of connecting one TV. Four happen at the set, four the agent verifies.
 *
 * The wizard exists because this is where the feature fails in practice: every
 * one of these is easy, and discovering which one was missed from a single
 * "could not connect" is not.
 */
const STEPS: WizardStep[] = [
  {
    step: 1,
    title: 'Assign this display to an agent',
    instruction:
      'Pick the venue agent in the remote control settings. Without one, nothing below can run.',
    checkable: false,
  },
  {
    step: 2,
    title: 'Enter the address on the venue network',
    instruction: "The TV's IP address, from Settings → Network on the set.",
    checkable: true,
  },
  {
    step: 3,
    title: 'Install the Developer Mode app',
    instruction:
      'On the TV: sign in with an LG account, install "Developer Mode" from the Content Store, open it and switch Dev Mode Status on. The set restarts.',
    checkable: false,
  },
  {
    step: 4,
    title: 'Switch the key server on',
    instruction: 'In the Developer Mode app, turn on "Key Server".',
    checkable: true,
  },
  {
    step: 5,
    title: 'Enter the passphrase',
    instruction:
      'The six characters the Developer Mode app shows as the passphrase. Save it in the remote control settings first.',
    checkable: true,
  },
  {
    step: 6,
    title: 'Check the connection to the TV',
    instruction: 'Nothing to do here — the agent connects and reports back.',
    checkable: true,
  },
  {
    step: 7,
    title: 'Confirm the pairing prompt',
    instruction:
      'The TV shows a prompt asking to allow the connection. Confirm it with the remote. This is needed once per display.',
    checkable: true,
  },
  {
    step: 8,
    title: 'Start the app',
    instruction: 'The agent extends developer mode and starts the player.',
    checkable: true,
  },
];

@Component({
  selector: 'app-screen-onboarding-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BtnComponent, IconComponent, ModalComponent, OverlayComponent],
  template: `
    <mns-overlay (closed)="closed.emit()">
      <mns-modal
        [title]="screen().name"
        sub="Connect this display"
        icon="Cast"
        [widthPx]="640"
        (closed)="closed.emit()"
      >
        <ol class="space-y-2">
          @for (item of steps; track item.step) {
            <li
              class="rounded-lg border p-3"
              [class.border-border]="item.step !== current()"
              [class.border-accent]="item.step === current()"
              [class.bg-surface-2]="item.step === current()"
            >
              <div class="flex items-start gap-3">
                <span
                  class="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[12px] font-bold"
                  [class.bg-ok-soft]="item.step < current()"
                  [class.text-ok]="item.step < current()"
                  [class.bg-accent-soft]="item.step === current()"
                  [class.text-accent]="item.step === current()"
                  [class.bg-surface-3]="item.step > current()"
                  [class.text-faint]="item.step > current()"
                >
                  @if (item.step < current()) {
                    <mns-icon name="Check" [size]="14" />
                  } @else {
                    {{ item.step }}
                  }
                </span>

                <div class="flex-1 min-w-0">
                  <div class="text-sm font-bold">{{ item.title }}</div>
                  @if (item.step === current()) {
                    <p class="mt-1 text-[13px] text-muted">{{ item.instruction }}</p>

                    @if (result(); as outcome) {
                      <p
                        class="mt-2 text-[13px]"
                        [class.text-danger]="!outcome.ok"
                        [class.text-ok]="outcome.ok"
                      >
                        {{ outcome.ok ? 'Looks good.' : outcome.detail || 'That did not work.' }}
                      </p>
                    }

                    <div class="mt-3 flex flex-wrap gap-2">
                      @if (item.checkable) {
                        <mns-btn size="sm" [disabled]="checking()" (mnsClick)="check(item.step)">
                          {{ checking() ? 'Checking…' : 'Check' }}
                        </mns-btn>
                      } @else {
                        <mns-btn size="sm" (mnsClick)="advance()">Done, next</mns-btn>
                      }
                      @if (item.step > 1) {
                        <mns-btn size="sm" variant="outline" (mnsClick)="back()">Back</mns-btn>
                      }
                    </div>
                  }
                </div>
              </div>
            </li>
          }
        </ol>

        @if (remote().onboardingCompletedAt) {
          <p class="mt-4 text-[13px] text-ok">
            This display is set up. Re-run any step if something changes on the TV.
          </p>
        }

        <div class="mt-5 flex justify-end">
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
  protected readonly checking = signal(false);
  protected readonly result = signal<{ ok: boolean; detail: string | null } | null>(null);

  /** The check this wizard is waiting on, so another tab's result is ignored. */
  private pendingCommandId: string | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.current.set(this.remote().onboardingStep);

    // The answer arrives on the stream the dashboard already holds open, not on
    // the response to the check — nothing has to wait on a round trip to the
    // venue.
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
        this.current.set(Math.min(data.step + 1, STEPS.length));
        this.changed.emit();
      }
    });
  }

  ngOnDestroy(): void {
    this.settle();
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  protected check(step: number): void {
    this.result.set(null);
    this.checking.set(true);

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

  /** Steps the agent cannot verify are confirmed by the operator. */
  protected advance(): void {
    this.result.set(null);
    this.current.update((step) => Math.min(step + 1, STEPS.length));
  }

  protected back(): void {
    this.result.set(null);
    this.current.update((step) => Math.max(step - 1, 1));
  }

  private settle(): void {
    this.checking.set(false);
    this.pendingCommandId = null;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
