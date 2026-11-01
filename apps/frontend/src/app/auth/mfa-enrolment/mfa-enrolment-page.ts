import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '../auth.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { BtnComponent, IconComponent } from '../../ui';
import { describeMfaRequirement } from '../mfa-requirement';
import { MfaEnrolmentWizardComponent } from './mfa-enrolment-wizard';

/**
 * Mandatory MFA enrolment, full-screen and outside the shell. Reached when the
 * session is not MFA-confirmed although MFA is mandatory for the user
 * (super-admin, or a member of any organisation that requires it) and right
 * after the first-run setup. MFA is bound to the user, so the requirement
 * applies account-wide: the only ways out are finishing or signing out.
 */
@Component({
  selector: 'app-mfa-enrolment-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BtnComponent, IconComponent, MfaEnrolmentWizardComponent, TranslocoDirective],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-bg px-4 py-10" *transloco="let t">
      <div
        class="w-full max-w-[460px]"
        style="animation: fadeUp 0.45s cubic-bezier(0.22, 0.61, 0.36, 1) both"
      >
        <div class="mb-7 flex justify-center">
          <div class="flex items-center gap-3">
            <div
              class="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px]"
              style="background: linear-gradient(135deg, var(--accent), var(--accent-2))"
            >
              <mns-icon name="Layers" [size]="19" class="text-white" />
            </div>
            <span class="text-xl font-extrabold tracking-tight">myNextScreen</span>
          </div>
        </div>

        <div
          class="w-full rounded-xl border border-border bg-surface p-7"
          style="box-shadow: var(--shadow)"
        >
          <div class="mb-5 flex items-start gap-3">
            <div
              class="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent"
            >
              <mns-icon name="Lock" [size]="20" />
            </div>
            <div class="min-w-0">
              <h1 class="text-[20px] font-extrabold tracking-tight">
                {{ t('auth.mfa.page.title') }}
              </h1>
              <p class="reason mt-1 text-[13.5px] text-muted">
                @if (reason(); as r) {
                  {{ t('auth.mfa.page.reason' + r.variant, r.params) }}
                } @else {
                  {{ t('auth.mfa.page.reasonUnknown') }}
                }
              </p>
              <p class="account-wide mt-1.5 text-[13.5px] text-muted">
                {{ t('auth.mfa.page.accountWide') }}
              </p>
            </div>
          </div>

          <app-mfa-enrolment-wizard (finished)="onFinished()" />
        </div>

        <div class="mt-5 flex justify-center">
          <mns-btn variant="ghost" icon="Logout" (mnsClick)="logout()">
            {{ t('auth.mfa.page.logout') }}
          </mns-btn>
        </div>
      </div>
    </div>
  `,
})
export class MfaEnrolmentPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly orgState = inject(OrganisationStateService);
  private readonly router = inject(Router);

  /** Why MFA is mandatory, or null while the reason is not known (generic text). */
  protected readonly reason = computed(() =>
    describeMfaRequirement(this.auth.mfaEnrolment()?.requiredBy, this.orgState.organisations()),
  );

  ngOnInit(): void {
    // The shell normally loads the memberships; this page runs without it.
    const orgIds = this.auth.mfaEnrolment()?.requiredBy?.organisationIds ?? [];
    if (orgIds.length > 0 && this.orgState.organisations().length === 0) {
      this.orgState.loadOrganisations();
    }
  }

  protected async onFinished(): Promise<void> {
    await this.router.navigateByUrl('/');
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
