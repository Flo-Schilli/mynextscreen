import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LocaleDatePipe } from '../../i18n/locale-format.pipes';
import {
  BtnComponent,
  CardComponent,
  CardHeadComponent,
  IconComponent,
  ModalComponent,
  OverlayComponent,
  PageHeaderComponent,
  SwitchComponent,
} from '../../ui';
import { SettingsTabsComponent } from '../settings-tabs.component';
import { OrgSecurityStore } from './org-security.store';

/** Org-admin security settings: require MFA for every member of the organisation. */
@Component({
  selector: 'app-org-security',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OrgSecurityStore],
  imports: [
    SettingsTabsComponent,
    PageHeaderComponent,
    CardComponent,
    CardHeadComponent,
    SwitchComponent,
    IconComponent,
    OverlayComponent,
    ModalComponent,
    BtnComponent,
    RouterLink,
    LocaleDatePipe,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <app-settings-tabs />

      <mns-page-header
        [title]="t('settings.org.security.page.title')"
        [sub]="t('settings.org.security.page.subtitle')"
        icon="Lock"
      />

      @if (store.loading()) {
        <p class="text-sm text-muted mt-6">{{ t('settings.org.security.loading') }}</p>
      }
      @if (store.loadError()) {
        <p class="error text-sm text-offline mt-3">{{ store.loadError() }}</p>
      }

      @if (store.requirement(); as r) {
        <mns-card [animate]="true" class="block max-w-[720px]">
          <mns-card-head
            [title]="t('settings.org.security.mfa.title')"
            [sub]="t('settings.org.security.mfa.subtitle')"
            icon="Lock"
          />
          <div class="flex items-center justify-between gap-4 py-3">
            <div class="min-w-0">
              <div class="text-sm font-semibold">{{ t('settings.org.security.mfa.label') }}</div>
              <div class="text-[13px] text-muted mt-0.5">
                {{ t('settings.org.security.mfa.desc') }}
              </div>
              @if (r.requireMfa && r.requireMfaSince) {
                <div class="since text-[12.5px] text-muted mt-1.5">
                  {{ t('settings.org.security.mfa.since') }}
                  {{ r.requireMfaSince | localeDate: 'medium' }}
                </div>
              }
            </div>
            <mns-switch
              [(checked)]="store.switchOn"
              [disabled]="store.switchDisabled()"
              (toggled)="store.toggle($event)"
            />
          </div>
          @if (!r.requireMfa && !store.canEnable()) {
            <p
              class="own-mfa-hint flex items-start gap-2 text-[13px] text-warn bg-warn-dim rounded-[10px] px-3 py-2.5 mt-2"
            >
              <mns-icon name="Alert" [size]="16" />
              <span>
                {{ t('settings.org.security.mfa.ownMfaRequired') }}
                <a routerLink="/settings/user" class="font-semibold underline">{{
                  t('settings.org.security.mfa.ownMfaLink')
                }}</a>
              </span>
            </p>
          }
        </mns-card>
      }

      @if (store.confirmOpen()) {
        <mns-overlay (closed)="store.cancelEnable()">
          <mns-modal
            [title]="t('settings.org.security.confirm.title')"
            icon="Lock"
            (closed)="store.cancelEnable()"
          >
            <p class="text-sm text-muted leading-relaxed">
              {{ t('settings.org.security.confirm.body') }}
            </p>
            <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-1">
              <mns-btn variant="outline" (mnsClick)="store.cancelEnable()">{{
                t('common.actions.cancel')
              }}</mns-btn>
              <mns-btn variant="primary" icon="Lock" (mnsClick)="store.confirmEnable()">{{
                t('settings.org.security.confirm.submit')
              }}</mns-btn>
            </div>
          </mns-modal>
        </mns-overlay>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class OrgSecurity implements OnInit {
  protected readonly store = inject(OrgSecurityStore);

  ngOnInit(): void {
    this.store.load();
  }
}
