import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { InstanceAdminService } from './instance-admin.service';
import { InstanceAdminSummary } from './instance-admin.model';
import { StorageUsageBars } from '../../shared/storage-usage-bars';
import { UsageBar } from '../../shared/usage-bar';
import { formatBytes } from '../../shared/format-bytes';

/**
 * Smart container for the instance-admin overview dashboard. Loads the
 * aggregate instance summary (user counts, organisation count, storage limits
 * vs. usage across all tenants and host disk free space) and renders it as a
 * grid of cards, reusing the shared storage/usage bars.
 */
@Component({
  selector: 'app-instance-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StorageUsageBars, UsageBar],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Instance Admin</h1>
        </div>
      </header>

      <nav class="settings-nav">
        <a class="settings-nav-link active">Dashboard</a>
        <a class="settings-nav-link" routerLink="/admin/organisations">Organisations</a>
        <a class="settings-nav-link" routerLink="/admin/users">Users</a>
      </nav>

      @if (loadError()) {
        <p class="error">{{ loadError() }}</p>
      }

      @if (loading()) {
        <p class="loading-text">Loading instance overview...</p>
      }

      @if (summary(); as s) {
        <div class="card-grid">
          <!-- Users -->
          <section class="card">
            <div class="card-header">
              <h2 class="card-title">Users</h2>
              <span class="card-badge">{{ s.users.total }} total</span>
            </div>
            <div class="card-body stat-row">
              <div class="stat">
                <span class="stat-value verified">{{ s.users.verified }}</span>
                <span class="stat-label">Verified</span>
              </div>
              <div class="stat">
                <span class="stat-value pending">{{ s.users.pending }}</span>
                <span class="stat-label">Pending</span>
              </div>
            </div>
          </section>

          <!-- Organisations -->
          <section class="card">
            <div class="card-header">
              <h2 class="card-title">Organisations</h2>
            </div>
            <div class="card-body stat-row">
              <div class="stat">
                <span class="stat-value">{{ s.organisationCount }}</span>
                <span class="stat-label">Organisations</span>
              </div>
            </div>
          </section>

          <!-- Aggregate storage (allocated vs used across all orgs) -->
          <section class="card card-wide">
            <div class="card-header">
              <h2 class="card-title">Storage — Allocated vs Used</h2>
              <span class="card-badge">All organisations</span>
            </div>
            <div class="card-body">
              <app-storage-usage-bars [storage]="s.storage" />
            </div>
          </section>

          <!-- Host disk free space -->
          <section class="card card-wide">
            <div class="card-header">
              <h2 class="card-title">Host Disk</h2>
              <span class="card-badge">{{ s.hostDisk.path }}</span>
            </div>
            <div class="card-body">
              @if (s.hostDisk.available) {
                <app-usage-bar
                  label="Used"
                  [usedBytes]="hostUsedBytes()"
                  [totalBytes]="s.hostDisk.totalBytes"
                  variant="teal"
                />
                <p class="disk-caption">
                  {{ formatBytes(s.hostDisk.freeBytes) }} free of
                  {{ formatBytes(s.hostDisk.totalBytes) }}
                </p>
              } @else {
                <div class="empty-state">Disk usage unavailable on this host.</div>
              }
            </div>
          </section>
        </div>
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

    .card-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }
    .card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.25rem;
    }
    .card-wide {
      grid-column: 1 / -1;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }
    .card-badge {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      background: var(--color-bg-tertiary);
      padding: 0.125rem 0.5rem;
      border-radius: 0.375rem;
    }
    .stat-row {
      display: flex;
      gap: 2rem;
    }
    .stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
      color: var(--color-text-primary);
    }
    .stat-value.verified {
      color: #4ade80;
    }
    .stat-value.pending {
      color: #fbbf24;
    }
    .stat-label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }
    .disk-caption {
      margin: 0.5rem 0 0;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .empty-state {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .card-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class InstanceDashboard implements OnInit {
  private service = inject(InstanceAdminService);
  private router = inject(Router);

  readonly summary = signal<InstanceAdminSummary | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  readonly hostUsedBytes = computed(() => {
    const disk = this.summary()?.hostDisk;
    if (!disk) return 0;
    return Math.max(0, disk.totalBytes - disk.freeBytes);
  });

  protected readonly formatBytes = formatBytes;

  ngOnInit(): void {
    this.service.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          err.status === 403
            ? 'Access denied. Instance Admin privileges required.'
            : 'Failed to load instance overview.',
        );
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
