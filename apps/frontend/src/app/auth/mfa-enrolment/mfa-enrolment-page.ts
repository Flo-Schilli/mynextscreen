import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '../auth.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { BtnComponent, IconComponent } from '../../ui';
import { MfaEnrolmentWizardComponent } from './mfa-enrolment-wizard';

/**
 * Mandatory MFA enrolment, full-screen and outside the shell. Reached when the
 * backend refuses a session without MFA (super-admin, or an organisation that
 * requires it) and right after the first-run setup. It cannot be skipped: the
 * only ways out are finishing, signing out, or — in the organisation case —
 * switching to another organisation that does not require MFA.
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
                @if (isOrganisationCase()) {
                  @if (requiringOrgName(); as orgName) {
                    {{ t('auth.mfa.page.reasonOrganisation', { name: orgName }) }}
                  } @else {
                    {{ t('auth.mfa.page.reasonOrganisationUnnamed') }}
                  }
                } @else {
                  {{ t('auth.mfa.page.reasonSuperAdmin') }}
                }
              </p>
            </div>
          </div>

          <app-mfa-enrolment-wizard (finished)="onFinished()" />

          @if (otherOrganisations().length > 0) {
            <div class="other-orgs mt-6 border-t border-border pt-4">
              <p class="mb-2 text-[12.5px] font-semibold text-muted">
                {{ t('auth.mfa.page.otherOrganisations') }}
              </p>
              <div class="flex flex-col gap-1.5">
                @for (org of otherOrganisations(); track org.id) {
                  <button
                    type="button"
                    class="flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-left text-[13.5px] hover:bg-hover"
                    (click)="switchOrganisation(org.id)"
                  >
                    <mns-icon name="Building" [size]="15" class="text-muted" />
                    {{ org.name }}
                  </button>
                }
              </div>
            </div>
          }
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

  protected readonly isOrganisationCase = computed(
    () => this.auth.mfaEnrolment()?.kind === 'organisation',
  );

  private readonly requiringOrgId = computed(() => {
    const reason = this.auth.mfaEnrolment();
    return reason?.kind === 'organisation' ? reason.organisationId : null;
  });

  protected readonly requiringOrgName = computed(() => {
    const id = this.requiringOrgId() ?? this.orgState.selectedOrgId();
    return this.orgState.organisations().find((org) => org.id === id)?.name ?? null;
  });

  /** Only offered in the organisation case: MFA there is per organisation. */
  protected readonly otherOrganisations = computed(() => {
    if (!this.isOrganisationCase()) {
      return [];
    }
    const blocked = this.requiringOrgId() ?? this.orgState.selectedOrgId();
    return this.orgState.organisations().filter((org) => org.id !== blocked);
  });

  ngOnInit(): void {
    // The shell normally loads the memberships; this page runs without it.
    if (this.isOrganisationCase() && this.orgState.organisations().length === 0) {
      this.orgState.loadOrganisations();
    }
  }

  protected async onFinished(): Promise<void> {
    await this.router.navigateByUrl('/');
  }

  protected async switchOrganisation(orgId: string): Promise<void> {
    this.orgState.select(orgId);
    this.auth.clearEnrolment();
    await this.router.navigateByUrl('/');
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
