import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  ],
  template: `
    <app-settings-tabs />

    <mns-page-header
      title="Storage"
      sub="Track media usage against your allocated limits."
      icon="Storage"
    />

    @if (loading()) {
      <p class="loading-text text-sm text-muted mt-6">Loading storage usage...</p>
    }

    @if (loadError()) {
      <p class="error text-sm text-offline mt-3">{{ loadError() }}</p>
    }

    @if (storage(); as s) {
      <mns-card [animate]="true" class="block max-w-[720px]">
        <mns-card-head
          title="Storage usage"
          sub="Your organisation's usage against its allocated limits. Contact an instance administrator to change these limits."
          icon="Storage"
        />
        <app-storage-usage-bars [storage]="s" />
      </mns-card>
    }
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

  readonly storage = signal<StorageInfo | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  ngOnInit(): void {
    const orgId = this.orgState.selectedOrgId();
    if (!orgId) {
      this.loadError.set('No organisation selected.');
      this.loading.set(false);
      return;
    }

    this.contentService.getStorage(orgId).subscribe({
      next: (info) => {
        this.storage.set(info);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err.status === 403 ? 'Access denied.' : 'Failed to load storage usage.');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
