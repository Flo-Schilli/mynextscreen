import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ContentService } from '../../content/content.service';
import { StorageInfo } from '../../content/content.model';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { StorageUsageBars } from '../../shared/storage-usage-bars';
import { SettingsTabsComponent } from '../settings-tabs.component';
import { CardComponent, CardHeadComponent, PageHeaderComponent } from '../../ui';

/**
 * Org-admin storage overview: the active organisation's original/transcoded
 * usage vs. its limits, rendered with the shared colored progress bars. Read
 * only — limits are managed by instance admins.
 */
@Component({
  selector: 'app-org-storage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SettingsTabsComponent,
    StorageUsageBars,
    CardComponent,
    CardHeadComponent,
    PageHeaderComponent,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <app-settings-tabs />

      <mns-page-header
        [title]="t('settings.org.storage.page.title')"
        [sub]="t('settings.org.storage.page.subtitle')"
        icon="Storage"
      />

      @if (loading()) {
        <p class="loading-text text-sm text-muted mt-6">
          {{ t('settings.org.storage.loading') }}
        </p>
      }

      @if (loadError()) {
        <p class="error text-sm text-offline mt-3">{{ loadError() }}</p>
      }

      @if (storage(); as s) {
        <mns-card [animate]="true" class="block max-w-[720px]">
          <mns-card-head
            [title]="t('settings.org.storage.card.title')"
            [sub]="t('settings.org.storage.card.subtitle')"
            icon="Storage"
          />
          <app-storage-usage-bars [storage]="s" />
        </mns-card>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
        animation: none !important;
      }
    }
  `,
})
export class OrgStorage implements OnInit {
  private contentService = inject(ContentService);
  private orgState = inject(OrganisationStateService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);

  readonly storage = signal<StorageInfo | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  ngOnInit(): void {
    const orgId = this.orgState.selectedOrgId();
    if (!orgId) {
      this.loadError.set(this.transloco.translate('settings.org.storage.errors.noOrgSelected'));
      this.loading.set(false);
      return;
    }

    this.contentService.getStorage(orgId).subscribe({
      next: (info) => {
        this.storage.set(info);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          err.status === 403
            ? this.transloco.translate('settings.org.storage.errors.accessDenied')
            : this.transloco.translate('settings.org.storage.errors.loadStorage'),
        );
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
