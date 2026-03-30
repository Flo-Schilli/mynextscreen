import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { OrganisationService } from './organisation.service';
import { Organisation, CreateOrganisationDto, UpdateOrganisationDto } from './organisation.model';
import { IANA_TIME_ZONES } from './timezones';

@Component({
  selector: 'app-organisations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">← Back</button>
          <h1>Organisations</h1>
        </div>
        <button class="btn btn-primary" (click)="openCreateForm()" *ngIf="!showForm">
          + New Organisation
        </button>
      </header>

      <!-- Create / Edit Form -->
      <div class="form-card" *ngIf="showForm">
        <h2>{{ editingId ? 'Edit Organisation' : 'Create Organisation' }}</h2>
        <form (ngSubmit)="submitForm()">
          <div class="form-group">
            <label for="name">Name</label>
            <input
              id="name"
              type="text"
              [(ngModel)]="formData.name"
              name="name"
              required
              placeholder="Organisation name"
            />
          </div>

          <div class="form-group">
            <label for="timeZone">Time Zone</label>
            <select id="timeZone" [(ngModel)]="formData.timeZone" name="timeZone" required>
              <option value="" disabled>Select a time zone</option>
              <option *ngFor="let tz of timeZones" [value]="tz">{{ tz }}</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="storageOriginal">Original Storage Limit (MB)</label>
              <input
                id="storageOriginal"
                type="number"
                [(ngModel)]="storageOriginalMB"
                name="storageOriginal"
                required
                min="0"
              />
            </div>
            <div class="form-group">
              <label for="storageTranscoded">Transcoded Storage Limit (MB)</label>
              <input
                id="storageTranscoded"
                type="number"
                [(ngModel)]="storageTranscodedMB"
                name="storageTranscoded"
                required
                min="0"
              />
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="cancelForm()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="submitting">
              {{ editingId ? 'Save Changes' : 'Create' }}
            </button>
          </div>
        </form>
        <p class="error" *ngIf="formError">{{ formError }}</p>
      </div>

      <!-- Error state -->
      <p class="error" *ngIf="loadError">{{ loadError }}</p>

      <!-- Loading state -->
      <p class="loading-text" *ngIf="loading">Loading organisations…</p>

      <!-- Table -->
      <div class="table-container" *ngIf="!loading && organisations.length > 0">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Time Zone</th>
              <th>Original Limit</th>
              <th>Transcoded Limit</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let org of organisations">
              <td>{{ org.name }}</td>
              <td>{{ org.timeZone }}</td>
              <td>{{ formatBytes(org.storageOriginalLimitBytes) }}</td>
              <td>{{ formatBytes(org.storageTranscodedLimitBytes) }}</td>
              <td>{{ org.createdAt | date:'mediumDate' }}</td>
              <td>
                <button class="btn btn-small" (click)="openEditForm(org)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <p class="empty-text" *ngIf="!loading && organisations.length === 0 && !loadError">
        No organisations yet. Create your first one.
      </p>
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      padding: 2rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .header-left h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
    .back-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    .back-btn:hover {
      color: var(--color-text-primary);
      background: var(--color-bg-secondary);
    }

    /* Buttons */
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.15s;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary {
      background: var(--color-accent);
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }
    .btn-secondary {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .btn-secondary:hover {
      background: var(--color-border);
    }
    .btn-small {
      padding: 0.25rem 0.75rem;
      font-size: 0.8125rem;
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .btn-small:hover {
      background: var(--color-border);
    }

    /* Form */
    .form-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      max-width: 40rem;
    }
    .form-card h2 {
      margin: 0 0 1.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      box-sizing: border-box;
    }
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-bg-secondary);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    thead {
      background: var(--color-bg-tertiary);
    }
    th {
      text-align: left;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
    }
    td {
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      border-top: 1px solid var(--color-border);
    }
    tr:hover td {
      background: var(--color-bg-tertiary);
    }

    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .loading-text, .empty-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
  `,
})
export class Organisations implements OnInit {
  private orgService = inject(OrganisationService);
  private router = inject(Router);

  organisations: Organisation[] = [];
  loading = true;
  loadError = '';
  showForm = false;
  editingId: string | null = null;
  submitting = false;
  formError = '';
  timeZones = IANA_TIME_ZONES;

  formData = { name: '', timeZone: '' };
  storageOriginalMB = 0;
  storageTranscodedMB = 0;

  ngOnInit(): void {
    this.loadOrganisations();
  }

  loadOrganisations(): void {
    this.loading = true;
    this.loadError = '';
    this.orgService.getAll().subscribe({
      next: (orgs) => {
        this.organisations = orgs;
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403
          ? 'Access denied. Super-admin privileges required.'
          : 'Failed to load organisations.';
        this.loading = false;
      },
    });
  }

  openCreateForm(): void {
    this.editingId = null;
    this.formData = { name: '', timeZone: '' };
    this.storageOriginalMB = 0;
    this.storageTranscodedMB = 0;
    this.formError = '';
    this.showForm = true;
  }

  openEditForm(org: Organisation): void {
    this.editingId = org.id;
    this.formData = { name: org.name, timeZone: org.timeZone };
    this.storageOriginalMB = Math.round(org.storageOriginalLimitBytes / (1024 * 1024));
    this.storageTranscodedMB = Math.round(org.storageTranscodedLimitBytes / (1024 * 1024));
    this.formError = '';
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.formError = '';
  }

  submitForm(): void {
    if (!this.formData.name || !this.formData.timeZone) {
      this.formError = 'Name and time zone are required.';
      return;
    }

    this.submitting = true;
    this.formError = '';

    const payload = {
      name: this.formData.name,
      timeZone: this.formData.timeZone,
      storageOriginalLimitBytes: this.storageOriginalMB * 1024 * 1024,
      storageTranscodedLimitBytes: this.storageTranscodedMB * 1024 * 1024,
    };

    const request$ = this.editingId
      ? this.orgService.update(this.editingId, payload)
      : this.orgService.create(payload);

    request$.subscribe({
      next: () => {
        this.showForm = false;
        this.editingId = null;
        this.submitting = false;
        this.loadOrganisations();
      },
      error: (err) => {
        this.formError = err.error?.message || 'An error occurred. Please try again.';
        this.submitting = false;
      },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
