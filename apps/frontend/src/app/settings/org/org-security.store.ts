import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { OrgMfaRequirementView } from '@mynextscreen/shared-types';
import { AuthService } from '../../auth/auth.service';
import { mfaErrorCode } from '../../auth/mfa-errors';
import { ToastService } from '../../shared/toast/toast.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { OrgMfaService } from './org-mfa.service';

/**
 * State of the org security page: the "require MFA for all members" switch.
 * Switching it on asks for confirmation and is only possible while the admin's
 * own session is MFA-confirmed (the backend refuses otherwise with
 * `MFA_SELF_REQUIRED`); switching it off is always possible.
 */
@Injectable()
export class OrgSecurityStore {
  private readonly orgMfa = inject(OrgMfaService);
  private readonly auth = inject(AuthService);
  private readonly orgState = inject(OrganisationStateService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly requirement = signal<OrgMfaRequirementView | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly confirmOpen = signal(false);
  /** What the switch shows; follows the saved value, set back when a change is abandoned. */
  readonly switchOn = linkedSignal(() => this.requirement()?.requireMfa ?? false);

  /** The admin's own session is MFA-confirmed, so the requirement may be switched on. */
  readonly canEnable = computed(() => this.auth.sessionMfa());
  readonly switchDisabled = computed(
    () => this.saving() || (!(this.requirement()?.requireMfa ?? false) && !this.canEnable()),
  );

  private orgId = '';

  load(): void {
    const org = this.orgState.selectedOrg();
    if (!org) {
      this.fail('settings.org.security.errors.noOrgSelected');
      return;
    }
    if (org.role !== 'org_admin') {
      this.fail('settings.org.security.errors.noOrgAdmin');
      return;
    }
    this.orgId = org.id;
    this.orgMfa.getRequirement(org.id).subscribe({
      next: (view) => {
        this.requirement.set(view);
        this.loading.set(false);
      },
      error: () => this.fail('settings.org.security.errors.load'),
    });
  }

  /** The switch was flipped: switching on needs a confirmation first. */
  toggle(next: boolean): void {
    if (next) {
      this.confirmOpen.set(true);
      return;
    }
    this.save(false);
  }

  confirmEnable(): void {
    this.confirmOpen.set(false);
    this.save(true);
  }

  cancelEnable(): void {
    this.confirmOpen.set(false);
    this.switchOn.set(this.requirement()?.requireMfa ?? false);
  }

  private save(requireMfa: boolean): void {
    this.saving.set(true);
    this.orgMfa.setRequirement(this.orgId, requireMfa).subscribe({
      next: (view) => {
        this.requirement.set(view);
        this.saving.set(false);
        this.toast.success(
          this.translate(
            requireMfa
              ? 'settings.org.security.toast.enabled'
              : 'settings.org.security.toast.disabled',
          ),
        );
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.switchOn.set(this.requirement()?.requireMfa ?? false);
        this.toast.error(
          this.translate(
            mfaErrorCode(err) === 'MFA_SELF_REQUIRED'
              ? 'settings.org.security.errors.selfRequired'
              : 'settings.org.security.errors.save',
          ),
        );
      },
    });
  }

  private fail(key: string): void {
    this.loadError.set(this.translate(key));
    this.loading.set(false);
  }

  private translate(key: string): string {
    return this.transloco.translate(key);
  }
}
