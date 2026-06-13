import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContentService } from '../../content/content.service';
import { StorageInfo } from '../../content/content.model';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { StorageUsageBars } from '../../shared/storage-usage-bars';

/**
 * Org-admin storage overview: the active organisation's original/transcoded
 * usage vs. its limits, rendered with the shared colored progress bars. Read
 * only — limits are managed by instance admins.
 */
@Component({
  selector: 'app-org-storage',
  standalone: true,
  imports: [RouterLink, StorageUsageBars],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Storage</h1>
        </div>
      </header>

      <nav class="settings-nav">
        <a class="settings-nav-link" routerLink="/settings/users">User Management</a>
        <a class="settings-nav-link" routerLink="/settings/org/notifications"
          >Notification Config</a
        >
        <a class="settings-nav-link active">Storage</a>
      </nav>

      @if (loading()) {
        <p class="loading-text">Loading storage usage...</p>
      }

      @if (loadError()) {
        <p class="error">{{ loadError() }}</p>
      }

      @if (storage(); as s) {
        <section class="storage-panel">
          <p class="section-desc">
            Your organisation's storage usage against its allocated limits. Contact an instance
            administrator to change these limits.
          </p>
          <app-storage-usage-bars [storage]="s" />
        </section>
      }
    </div>
  `,
  styles: `
    .settings-nav {
      display: flex;
      gap: 0;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }
    .settings-nav-link {
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition:
        color 0.15s,
        border-color 0.15s;
    }
    .settings-nav-link:hover {
      color: var(--color-text-primary);
    }
    .settings-nav-link.active {
      color: var(--color-text-primary);
      border-bottom-color: var(--color-accent);
      font-weight: 500;
    }
    .storage-panel {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 40rem;
    }
    .section-desc {
      margin: 0 0 1.25rem;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
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
