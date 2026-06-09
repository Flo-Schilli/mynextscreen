import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateScreenRequest } from './screen.model';

/**
 * Register-screen form. Owns its own field state (name, location, resolution
 * with a custom-resolution escape hatch) and validates required fields locally,
 * emitting a resolved {@link CreateScreenRequest} only when valid. The parent
 * performs the HTTP request and feeds `creating`/`error` back in.
 */
@Component({
  selector: 'app-screen-create-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="form-card">
      <h2>Register New Screen</h2>
      <form (ngSubmit)="onSubmit()">
        <div class="form-row">
          <div class="form-group">
            <label for="createName">Name</label>
            <input
              id="createName"
              type="text"
              [(ngModel)]="name"
              name="createName"
              required
              placeholder="e.g. Main Stage Left"
            />
          </div>
          <div class="form-group">
            <label for="createLocation">Location</label>
            <input
              id="createLocation"
              type="text"
              [(ngModel)]="location"
              name="createLocation"
              required
              placeholder="e.g. Entrance Hall"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="createResolution">Resolution</label>
          <select id="createResolution" [(ngModel)]="resolution" name="createResolution" required>
            <option value="1920x1080">1920x1080 (Full HD)</option>
            <option value="3840x2160">3840x2160 (4K UHD)</option>
            <option value="1280x720">1280x720 (HD)</option>
            <option value="2560x1440">2560x1440 (QHD)</option>
            <option value="1080x1920">1080x1920 (Full HD Portrait)</option>
            <option value="custom">Custom...</option>
          </select>
        </div>
        @if (resolution === 'custom') {
          <div class="form-group">
            <label for="createCustomRes">Custom Resolution</label>
            <input
              id="createCustomRes"
              type="text"
              [(ngModel)]="customResolution"
              name="createCustomResolution"
              required
              placeholder="e.g. 1920x1200"
            />
          </div>
        }
        @if (localError() || error()) {
          <p class="error">{{ localError() || error() }}</p>
        }
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="creating()">
            {{ creating() ? 'Registering...' : 'Register Screen' }}
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
export class ScreenCreateForm {
  readonly creating = input.required<boolean>();
  readonly error = input.required<string>();

  readonly create = output<CreateScreenRequest>();
  readonly dismiss = output<void>();

  protected name = '';
  protected location = '';
  protected resolution = '1920x1080';
  protected customResolution = '';
  protected readonly localError = signal('');

  onSubmit(): void {
    const resolution = this.resolution === 'custom' ? this.customResolution : this.resolution;

    if (!this.name || !this.location || !resolution) {
      this.localError.set('All fields are required.');
      return;
    }

    this.localError.set('');
    this.create.emit({ name: this.name, location: this.location, resolution });
  }
}
