import { Component, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Screen, UpdateScreenRequest } from './screen.model';

/**
 * Edit-screen form. Seeds its field state once from the `screen` input on open
 * (the parent recreates the component per selection via `@if`), validates
 * required fields locally, and emits an {@link UpdateScreenRequest} when valid.
 * The parent performs the HTTP request and feeds `saving`/`error` back in.
 */
@Component({
  selector: 'app-screen-edit-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="form-card">
      <h2>Edit Screen</h2>
      <form (ngSubmit)="onSubmit()">
        <div class="form-row">
          <div class="form-group">
            <label for="editName">Name</label>
            <input id="editName" type="text" [(ngModel)]="name" name="editName" required />
          </div>
          <div class="form-group">
            <label for="editLocation">Location</label>
            <input
              id="editLocation"
              type="text"
              [(ngModel)]="location"
              name="editLocation"
              required
            />
          </div>
        </div>
        <div class="form-group">
          <label for="editResolution">Resolution</label>
          <input
            id="editResolution"
            type="text"
            [(ngModel)]="resolution"
            name="editResolution"
            required
          />
        </div>
        @if (localError() || error()) {
          <p class="error">{{ localError() || error() }}</p>
        }
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    /* Form Card */
    .form-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 40rem;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
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
export class ScreenEditForm implements OnInit {
  readonly screen = input.required<Screen>();
  readonly saving = input.required<boolean>();
  readonly error = input.required<string>();

  readonly save = output<UpdateScreenRequest>();
  readonly dismiss = output<void>();

  protected name = '';
  protected location = '';
  protected resolution = '';
  protected readonly localError = signal('');

  ngOnInit(): void {
    const screen = this.screen();
    this.name = screen.name;
    this.location = screen.location;
    this.resolution = screen.resolution;
  }

  onSubmit(): void {
    if (!this.name || !this.location || !this.resolution) {
      this.localError.set('All fields are required.');
      return;
    }

    this.localError.set('');
    this.save.emit({ name: this.name, location: this.location, resolution: this.resolution });
  }
}
