import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScreenService } from './screen.service';
import { Screen } from './screen.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';

@Component({
  selector: 'app-screens',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Screen Management</h1>
        </div>
        @if (!loading && !selectedScreen && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">
            + Register Screen
          </button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading screens...</p>
      }

      <!-- Create Screen Form -->
      @if (showCreateForm) {
        <div class="form-card">
          <h2>Register New Screen</h2>
          <form (ngSubmit)="submitCreate()">
            <div class="form-row">
              <div class="form-group">
                <label for="createName">Name</label>
                <input
                  id="createName"
                  type="text"
                  [(ngModel)]="createName"
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
                  [(ngModel)]="createLocation"
                  name="createLocation"
                  required
                  placeholder="e.g. Entrance Hall"
                />
              </div>
            </div>
            <div class="form-group">
              <label for="createResolution">Resolution</label>
              <select id="createResolution" [(ngModel)]="createResolution" name="createResolution" required>
                <option value="1920x1080">1920x1080 (Full HD)</option>
                <option value="3840x2160">3840x2160 (4K UHD)</option>
                <option value="1280x720">1280x720 (HD)</option>
                <option value="2560x1440">2560x1440 (QHD)</option>
                <option value="1080x1920">1080x1920 (Full HD Portrait)</option>
                <option value="custom">Custom...</option>
              </select>
            </div>
            @if (createResolution === 'custom') {
              <div class="form-group">
                <label for="createCustomRes">Custom Resolution</label>
                <input
                  id="createCustomRes"
                  type="text"
                  [(ngModel)]="createCustomResolution"
                  name="createCustomResolution"
                  required
                  placeholder="e.g. 1920x1200"
                />
              </div>
            }
            @if (createError) {
              <p class="error">{{ createError }}</p>
            }
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelCreate()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="creating">
                {{ creating ? 'Registering...' : 'Register Screen' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Screen Detail View -->
      @if (selectedScreen && !editingScreen) {
        <div class="detail-card">
          <div class="detail-header">
            <h2>{{ selectedScreen.name }}</h2>
            <div class="detail-actions">
              <button class="btn btn-secondary" (click)="startEdit()">Edit</button>
              <button class="btn btn-secondary" (click)="closeDetail()">Close</button>
            </div>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Status</span>
              <span class="status-badge" [class.online]="selectedScreen.isOnline" [class.offline]="!selectedScreen.isOnline">
                {{ selectedScreen.isOnline ? 'Online' : 'Offline' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Location</span>
              <span>{{ selectedScreen.location }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Resolution</span>
              <span>{{ selectedScreen.resolution }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Last Heartbeat</span>
              <span>{{ selectedScreen.lastHeartbeat ? (selectedScreen.lastHeartbeat | date:'medium') : 'Never' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Registered</span>
              <span>{{ selectedScreen.createdAt | date:'mediumDate' }}</span>
            </div>
          </div>
          <div class="api-key-section">
            <h3>API Key Management</h3>
            <p class="text-muted">Regenerate the API key if it has been compromised. The current key will be invalidated immediately.</p>
            <button class="btn btn-danger" (click)="confirmRegenerate()" [disabled]="regenerating">
              Regenerate API Key
            </button>
          </div>
        </div>
      }

      <!-- Edit Screen Form -->
      @if (editingScreen) {
        <div class="form-card">
          <h2>Edit Screen</h2>
          <form (ngSubmit)="submitEdit()">
            <div class="form-row">
              <div class="form-group">
                <label for="editName">Name</label>
                <input
                  id="editName"
                  type="text"
                  [(ngModel)]="editName"
                  name="editName"
                  required
                />
              </div>
              <div class="form-group">
                <label for="editLocation">Location</label>
                <input
                  id="editLocation"
                  type="text"
                  [(ngModel)]="editLocation"
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
                [(ngModel)]="editResolution"
                name="editResolution"
                required
              />
            </div>
            @if (editError) {
              <p class="error">{{ editError }}</p>
            }
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Screen Grid -->
      @if (!loading && !selectedScreen && !showCreateForm && !editingScreen && screens.length > 0) {
        <div class="screen-grid">
          @for (screen of screens; track screen.id) {
            <div class="screen-card" (click)="selectScreen(screen)" tabindex="0" role="button"
                 (keydown.enter)="selectScreen(screen)" (keydown.space)="selectScreen(screen)">
              <div class="card-header">
                <span class="screen-name">{{ screen.name }}</span>
                <span class="status-dot" [class.online]="screen.isOnline" [class.offline]="!screen.isOnline"
                      [attr.title]="screen.isOnline ? 'Online' : 'Offline'"></span>
              </div>
              <div class="card-body">
                <div class="card-field">
                  <span class="card-label">Location</span>
                  <span class="card-value">{{ screen.location }}</span>
                </div>
                <div class="card-field">
                  <span class="card-label">Resolution</span>
                  <span class="card-value">{{ screen.resolution }}</span>
                </div>
                <div class="card-field">
                  <span class="card-label">Status</span>
                  <span class="card-value status-text" [class.online]="screen.isOnline" [class.offline]="!screen.isOnline">
                    {{ screen.isOnline ? 'Online' : 'Offline' }}
                  </span>
                </div>
              </div>
            </div>
          }
        </div>
      }

      @if (!loading && !selectedScreen && !showCreateForm && screens.length === 0 && !loadError) {
        <div class="empty-state">
          <p class="empty-text">No screens registered yet.</p>
          <button class="btn btn-primary" (click)="openCreateForm()">Register Your First Screen</button>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      <!-- API Key Modal -->
      @if (showApiKeyModal) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="API Key"
             tabindex="0" (click)="closeApiKeyModal()" (keydown.escape)="closeApiKeyModal()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Screen API Key</h2>
            <div class="api-key-warning">
              This API key will only be shown once. Copy it now and store it securely.
            </div>
            <div class="api-key-display">
              <code class="api-key-value">{{ displayedApiKey }}</code>
              <button class="btn btn-secondary btn-copy" (click)="copyApiKey()">
                {{ copied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" (click)="closeApiKeyModal()">Done</button>
            </div>
          </div>
        </div>
      }

      <!-- Regenerate Confirmation Modal -->
      @if (showRegenerateConfirm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm regeneration"
             tabindex="0" (click)="cancelRegenerate()" (keydown.escape)="cancelRegenerate()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Regenerate API Key</h2>
            <p>Are you sure you want to regenerate the API key for <strong>{{ selectedScreen?.name }}</strong>?</p>
            <p>The current API key will be invalidated immediately. The screen will need to be reconfigured with the new key.</p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelRegenerate()">Cancel</button>
              <button class="btn btn-danger" (click)="executeRegenerate()" [disabled]="regenerating">
                {{ regenerating ? 'Regenerating...' : 'Regenerate' }}
              </button>
            </div>
          </div>
        </div>
      }
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
    .btn-secondary:hover:not(:disabled) {
      background: var(--color-border);
    }
    .btn-danger {
      background: #991b1b;
      color: #fecaca;
    }
    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
    }

    /* Screen Grid */
    .screen-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
      gap: 1rem;
    }
    .screen-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.25rem;
      cursor: pointer;
      transition: border-color 0.15s, background-color 0.15s;
    }
    .screen-card:hover, .screen-card:focus {
      border-color: var(--color-accent);
      background: var(--color-bg-tertiary);
      outline: none;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .screen-name {
      font-size: 1rem;
      font-weight: 600;
    }
    .status-dot {
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.online {
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e80;
    }
    .status-dot.offline {
      background: #ef4444;
      box-shadow: 0 0 6px #ef444480;
    }
    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .card-field {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
    }
    .card-label {
      color: var(--color-text-secondary);
    }
    .card-value {
      color: var(--color-text-primary);
    }
    .status-text.online {
      color: #22c55e;
    }
    .status-text.offline {
      color: #ef4444;
    }

    /* Detail Card */
    .detail-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 40rem;
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .detail-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .detail-actions {
      display: flex;
      gap: 0.5rem;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
    }
    .status-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      width: fit-content;
    }
    .status-badge.online {
      background: #22c55e20;
      color: #22c55e;
    }
    .status-badge.offline {
      background: #ef444420;
      color: #ef4444;
    }

    .api-key-section {
      border-top: 1px solid var(--color-border);
      padding-top: 1.5rem;
    }
    .api-key-section h3 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      font-weight: 600;
    }
    .text-muted {
      color: var(--color-text-secondary);
      font-size: 0.8125rem;
      margin: 0 0 1rem;
      line-height: 1.5;
    }

    /* Form Card */
    .form-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
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
    .form-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      min-width: 24rem;
      max-width: 36rem;
    }
    .modal h2 {
      margin: 0 0 1.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }
    .modal p {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      line-height: 1.5;
    }
    .api-key-warning {
      background: #92400e20;
      border: 1px solid #92400e;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: #fbbf24;
      line-height: 1.5;
    }
    .api-key-display {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin-bottom: 1rem;
    }
    .api-key-value {
      flex: 1;
      font-size: 0.75rem;
      word-break: break-all;
      color: var(--color-accent);
    }
    .btn-copy {
      flex-shrink: 0;
      padding: 0.25rem 0.75rem;
      font-size: 0.8125rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }
    .empty-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .loading-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
  `,
})
export class Screens implements OnInit {
  private screenService = inject(ScreenService);
  private memberService = inject(MemberService);
  private router = inject(Router);

  orgId = '';
  screens: Screen[] = [];
  loading = true;
  loadError = '';
  actionError = '';

  // Create form state
  showCreateForm = false;
  createName = '';
  createLocation = '';
  createResolution = '1920x1080';
  createCustomResolution = '';
  createError = '';
  creating = false;

  // Detail view state
  selectedScreen: Screen | null = null;

  // Edit state
  editingScreen = false;
  editName = '';
  editLocation = '';
  editResolution = '';
  editError = '';
  saving = false;

  // API key modal
  showApiKeyModal = false;
  displayedApiKey = '';
  copied = false;

  // Regenerate confirmation
  showRegenerateConfirm = false;
  regenerating = false;

  ngOnInit(): void {
    this.loadCurrentOrg();
  }

  private loadCurrentOrg(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const adminMembership = memberships.find((m) => m.role === 'org_admin');
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.loadScreens();
        } else if (memberships.length > 0) {
          // Non-admin users can still view screens
          this.orgId = memberships[0].organisationId;
          this.loadScreens();
        } else {
          this.loadError = 'You are not a member of any organisation.';
          this.loading = false;
        }
      },
      error: () => {
        this.loadError = 'Failed to load organisation context.';
        this.loading = false;
      },
    });
  }

  loadScreens(): void {
    this.loading = true;
    this.loadError = '';
    this.actionError = '';
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.screens = screens;
        this.loading = false;
      },
      error: (err) => {
        this.loadError =
          err.status === 403
            ? 'Access denied.'
            : 'Failed to load screens.';
        this.loading = false;
      },
    });
  }

  // --- Create ---
  openCreateForm(): void {
    this.createName = '';
    this.createLocation = '';
    this.createResolution = '1920x1080';
    this.createCustomResolution = '';
    this.createError = '';
    this.showCreateForm = true;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
  }

  submitCreate(): void {
    const resolution = this.createResolution === 'custom'
      ? this.createCustomResolution
      : this.createResolution;

    if (!this.createName || !this.createLocation || !resolution) {
      this.createError = 'All fields are required.';
      return;
    }

    this.creating = true;
    this.createError = '';
    this.screenService.create(this.orgId, {
      name: this.createName,
      resolution,
      location: this.createLocation,
    }).subscribe({
      next: (result) => {
        this.creating = false;
        this.showCreateForm = false;
        this.displayedApiKey = result.apiKey;
        this.copied = false;
        this.showApiKeyModal = true;
        this.loadScreens();
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to register screen.';
        this.creating = false;
      },
    });
  }

  // --- Detail ---
  selectScreen(screen: Screen): void {
    this.selectedScreen = screen;
    this.editingScreen = false;
  }

  closeDetail(): void {
    this.selectedScreen = null;
  }

  // --- Edit ---
  startEdit(): void {
    if (!this.selectedScreen) return;
    this.editName = this.selectedScreen.name;
    this.editLocation = this.selectedScreen.location;
    this.editResolution = this.selectedScreen.resolution;
    this.editError = '';
    this.editingScreen = true;
  }

  cancelEdit(): void {
    this.editingScreen = false;
  }

  submitEdit(): void {
    if (!this.selectedScreen) return;
    if (!this.editName || !this.editLocation || !this.editResolution) {
      this.editError = 'All fields are required.';
      return;
    }

    this.saving = true;
    this.editError = '';
    this.screenService.update(this.orgId, this.selectedScreen.id, {
      name: this.editName,
      resolution: this.editResolution,
      location: this.editLocation,
    }).subscribe({
      next: (updated) => {
        this.saving = false;
        this.editingScreen = false;
        this.selectedScreen = updated;
        this.loadScreens();
      },
      error: (err) => {
        this.editError = err.error?.message || 'Failed to update screen.';
        this.saving = false;
      },
    });
  }

  // --- Regenerate API Key ---
  confirmRegenerate(): void {
    this.showRegenerateConfirm = true;
  }

  cancelRegenerate(): void {
    this.showRegenerateConfirm = false;
  }

  executeRegenerate(): void {
    if (!this.selectedScreen) return;

    this.regenerating = true;
    this.actionError = '';
    this.screenService.regenerateApiKey(this.orgId, this.selectedScreen.id).subscribe({
      next: (result) => {
        this.regenerating = false;
        this.showRegenerateConfirm = false;
        this.selectedScreen = result.screen;
        this.displayedApiKey = result.apiKey;
        this.copied = false;
        this.showApiKeyModal = true;
      },
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to regenerate API key.';
        this.regenerating = false;
        this.showRegenerateConfirm = false;
      },
    });
  }

  // --- API Key Modal ---
  closeApiKeyModal(): void {
    this.showApiKeyModal = false;
    this.displayedApiKey = '';
  }

  copyApiKey(): void {
    navigator.clipboard.writeText(this.displayedApiKey).then(() => {
      this.copied = true;
      setTimeout(() => { this.copied = false; }, 2000);
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
