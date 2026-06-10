import { Component, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Organisation } from './organisation.model';
import { IANA_TIME_ZONES } from './timezones';

export interface OrganisationFormPayload {
  name: string;
  timeZone: string;
  storageOriginalLimitBytes: number;
  storageTranscodedLimitBytes: number;
}

/**
 * Create/edit organisation form card. Seeds its field state once from the
 * optional `org` input on open (null = create; the parent recreates the
 * component via `@if`), validates locally and emits a resolved
 * {@link OrganisationFormPayload} (storage converted MB → bytes). The parent
 * performs the HTTP request and feeds `submitting`/`error` back in.
 */
@Component({
  selector: 'app-org-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="form-card">
      <h2>{{ org() ? 'Edit Organisation' : 'Create Organisation' }}</h2>
      <form (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            type="text"
            [(ngModel)]="name"
            name="name"
            required
            placeholder="Organisation name"
          />
        </div>

        <div class="form-group">
          <label for="timeZone">Time Zone</label>
          <select id="timeZone" [(ngModel)]="timeZone" name="timeZone" required>
            <option value="" disabled>Select a time zone</option>
            @for (tz of timeZones; track tz) {
              <option [value]="tz">{{ tz }}</option>
            }
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
          <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="submitting()">
            {{ org() ? 'Save Changes' : 'Create' }}
          </button>
        </div>
      </form>
      @if (localError() || error()) {
        <p class="error">{{ localError() || error() }}</p>
      }
    </div>
  `,
  styles: `
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
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
  `,
})
export class OrgForm implements OnInit {
  readonly org = input.required<Organisation | null>();
  readonly submitting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly save = output<OrganisationFormPayload>();
  readonly dismiss = output<void>();

  protected readonly timeZones = IANA_TIME_ZONES;

  protected name = '';
  protected timeZone = '';
  protected storageOriginalMB = 0;
  protected storageTranscodedMB = 0;
  protected readonly localError = signal('');

  ngOnInit(): void {
    const org = this.org();
    if (org) {
      this.name = org.name;
      this.timeZone = org.timeZone;
      this.storageOriginalMB = Math.round(org.storageOriginalLimitBytes / (1024 * 1024));
      this.storageTranscodedMB = Math.round(org.storageTranscodedLimitBytes / (1024 * 1024));
    }
  }

  onSubmit(): void {
    if (!this.name || !this.timeZone) {
      this.localError.set('Name and time zone are required.');
      return;
    }

    this.localError.set('');
    this.save.emit({
      name: this.name,
      timeZone: this.timeZone,
      storageOriginalLimitBytes: this.storageOriginalMB * 1024 * 1024,
      storageTranscodedLimitBytes: this.storageTranscodedMB * 1024 * 1024,
    });
  }
}
