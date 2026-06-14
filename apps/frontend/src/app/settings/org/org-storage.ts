import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContentService } from '../../content/content.service';
import { StorageInfo } from '../../content/content.model';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { StorageUsageBars } from '../../shared/storage-usage-bars';
import { CardComponent, CardHeadComponent } from '../../ui';

/**
 * Org-admin storage overview: the active organisation's original/transcoded
 * usage vs. its limits, rendered with the shared colored progress bars. Read
 * only — limits are managed by instance admins.
 */
@Component({
  selector: 'app-org-storage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StorageUsageBars, CardComponent, CardHeadComponent],
  template: `
    <!-- Tab bar -->
    <div class="flex gap-1 border-b border-border mb-[var(--gap,1.5rem)]">
      <a class="settings-tab" routerLink="/settings/users">User Management</a>
      <a class="settings-tab" routerLink="/settings/org/notifications">Notification Config</a>
      <a class="settings-tab settings-tab--active" aria-current="page">Storage</a>
    </div>

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

    .settings-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      margin-bottom: -1px;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      cursor: pointer;
      text-decoration: none;
      transition: color 0.15s;
    }
    .settings-tab:hover {
      color: var(--text);
    }
    .settings-tab--active {
      color: var(--text);
      border-bottom-color: var(--accent);
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
