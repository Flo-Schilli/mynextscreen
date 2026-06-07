import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LiveStreamService } from './live-stream.service';
import {
  LiveStream,
  LiveStreamProtocol,
  TranscodingPreset,
  CreateLiveStreamRequest,
  UpdateLiveStreamRequest,
  ActivateLiveStreamRequest,
  ActivateStreamResponse,
  TRANSCODING_PRESET_LABELS,
  TRANSCODING_PRESETS,
} from './live-stream.model';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';

@Component({
  selector: 'app-live-streams',
  standalone: true,
  imports: [FormsModule, UpperCasePipe],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Live Streams</h1>
        </div>
        @if (!loading && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">+ New Stream</button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading live streams...</p>
      }

      <!-- Create Stream Modal -->
      @if (showCreateForm) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Create Live Stream"
          tabindex="0"
          (click)="cancelCreate()"
          (keydown.escape)="cancelCreate()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Create Live Stream</h2>
            <form (ngSubmit)="submitCreate()">
              <div class="form-group">
                <label for="createName">Name</label>
                <input
                  id="createName"
                  type="text"
                  [(ngModel)]="createName"
                  name="createName"
                  required
                  placeholder="e.g. Lobby Camera"
                />
              </div>
              <div class="form-group">
                <label for="createSourceUrl">Source URL</label>
                <input
                  id="createSourceUrl"
                  type="text"
                  [(ngModel)]="createSourceUrl"
                  name="createSourceUrl"
                  required
                  placeholder="rtmp://example.com/live/stream-key"
                />
              </div>
              <div class="form-group">
                <label for="createProtocol">Protocol</label>
                <select
                  id="createProtocol"
                  [(ngModel)]="createProtocol"
                  name="createProtocol"
                  required
                >
                  <option value="rtmp">RTMP</option>
                  <option value="rtp">RTP</option>
                </select>
              </div>
              <div class="form-group">
                <label for="createPreset">Quality Preset</label>
                <select id="createPreset" [(ngModel)]="createPreset" name="createPreset">
                  @for (preset of transcodingPresets; track preset) {
                    <option [value]="preset">{{ presetLabel(preset) }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    [(ngModel)]="createAudioEnabled"
                    name="createAudioEnabled"
                  />
                  Enable audio
                </label>
              </div>
              @if (createError) {
                <p class="error">{{ createError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelCreate()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="creating">
                  {{ creating ? 'Creating...' : 'Create Stream' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Streams Table -->
      @if (!loading && streams.length > 0) {
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Source URL</th>
                <th>Protocol</th>
                <th>Quality</th>
                <th>Status</th>
                <th>Health</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (stream of streams; track stream.id) {
                <tr>
                  <td class="name-cell">{{ stream.name }}</td>
                  <td class="url-cell" [title]="stream.sourceUrl">{{ stream.sourceUrl }}</td>
                  <td>
                    <span class="protocol-badge">{{ stream.protocol | uppercase }}</span>
                  </td>
                  <td>{{ presetLabel(stream.transcodingPreset) }}</td>
                  <td>
                    <span
                      class="status-badge"
                      [class.status-idle]="stream.status === 'idle'"
                      [class.status-active]="stream.status === 'active'"
                      [class.status-error]="stream.status === 'error'"
                    >
                      {{ stream.status }}
                    </span>
                  </td>
                  <td>
                    @if (stream.status === 'active' && stream.health) {
                      <span
                        class="health-badge"
                        [class.health-healthy]="stream.health.health === 'healthy'"
                        [class.health-degraded]="stream.health.health === 'degraded'"
                        [class.health-stopped]="stream.health.health === 'stopped'"
                      >
                        {{ stream.health.health }}
                      </span>
                    } @else {
                      <span class="text-muted">-</span>
                    }
                  </td>
                  <td class="actions-cell">
                    @if (stream.status === 'idle' || stream.status === 'error') {
                      <button class="btn btn-small btn-primary" (click)="openActivateModal(stream)">
                        Activate
                      </button>
                      <button class="btn btn-small btn-secondary" (click)="editStream(stream)">
                        Edit
                      </button>
                      <button class="btn btn-small btn-danger" (click)="confirmDelete(stream)">
                        Delete
                      </button>
                    } @else {
                      <button class="btn btn-small btn-warning" (click)="deactivateStream(stream)">
                        Deactivate
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Empty State -->
      @if (!loading && streams.length === 0 && !loadError) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="2" />
              <path
                d="M12 12a17 17 0 000 24M36 12a17 17 0 010 24M8 8a23 23 0 000 32M40 8a23 23 0 010 32"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <p class="empty-title">No live streams yet</p>
          <p class="empty-text">Create your first live stream to start broadcasting to screens.</p>
          <button class="btn btn-primary" (click)="openCreateForm()">
            Create Your First Stream
          </button>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      <!-- Passthrough Warnings Banner -->
      @if (passthroughWarnings.length > 0) {
        <div class="warning-banner">
          <div class="warning-banner-header">
            <strong>Passthrough Compatibility Warnings</strong>
            <button
              class="warning-dismiss"
              (click)="dismissWarnings()"
              aria-label="Dismiss warnings"
            >
              &times;
            </button>
          </div>
          <ul class="warning-list">
            @for (warning of passthroughWarnings; track warning) {
              <li>{{ warning }}</li>
            }
          </ul>
        </div>
      }

      <!-- Edit Stream Modal -->
      @if (editingStream) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Live Stream"
          tabindex="0"
          (click)="cancelEdit()"
          (keydown.escape)="cancelEdit()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Edit Live Stream</h2>
            <form (ngSubmit)="submitEdit()">
              <div class="form-group">
                <label for="editName">Name</label>
                <input id="editName" type="text" [(ngModel)]="editName" name="editName" required />
              </div>
              <div class="form-group">
                <label for="editSourceUrl">Source URL</label>
                <input
                  id="editSourceUrl"
                  type="text"
                  [(ngModel)]="editSourceUrl"
                  name="editSourceUrl"
                  required
                />
              </div>
              <div class="form-group">
                <label for="editProtocol">Protocol</label>
                <select id="editProtocol" [(ngModel)]="editProtocol" name="editProtocol" required>
                  <option value="rtmp">RTMP</option>
                  <option value="rtp">RTP</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editPreset">Quality Preset</label>
                <select id="editPreset" [(ngModel)]="editPreset" name="editPreset">
                  @for (preset of transcodingPresets; track preset) {
                    <option [value]="preset">{{ presetLabel(preset) }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="editAudioEnabled" name="editAudioEnabled" />
                  Enable audio
                </label>
              </div>
              @if (editError) {
                <p class="error">{{ editError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelEdit()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="saving">
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingStream) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm deletion"
          tabindex="0"
          (click)="cancelDelete()"
          (keydown.escape)="cancelDelete()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Delete Live Stream</h2>
            <p>
              Are you sure you want to delete <strong>{{ deletingStream.name }}</strong
              >? This action cannot be undone.
            </p>
            @if (deleteError) {
              <p class="error">{{ deleteError }}</p>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelDelete()">Cancel</button>
              <button class="btn btn-danger" (click)="executeDelete()" [disabled]="deleting">
                {{ deleting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Activate Modal -->
      @if (activatingStream) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Activate Live Stream"
          tabindex="0"
          (click)="cancelActivate()"
          (keydown.escape)="cancelActivate()"
        >
          <div
            class="modal modal-wide"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Activate "{{ activatingStream.name }}"</h2>
            <p>Choose target screens or a screen group to stream to.</p>

            <div class="form-group">
              <span class="form-label">Target type</span>
              <div class="radio-group">
                <label class="radio-label">
                  <input
                    type="radio"
                    name="targetType"
                    value="screens"
                    [(ngModel)]="activateTargetType"
                  />
                  Individual Screens
                </label>
                <label class="radio-label">
                  <input
                    type="radio"
                    name="targetType"
                    value="group"
                    [(ngModel)]="activateTargetType"
                  />
                  Screen Group
                </label>
              </div>
            </div>

            @if (activateTargetType === 'screens') {
              <div class="form-group">
                <span class="form-label">Select screens</span>
                @if (screens.length === 0) {
                  <p class="text-muted">No screens available.</p>
                } @else {
                  <div class="checkbox-list">
                    @for (screen of screens; track screen.id) {
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [checked]="activateScreenIds.has(screen.id)"
                          (change)="toggleScreen(screen.id)"
                        />
                        {{ screen.name }}
                        @if (screen.location) {
                          <span class="text-muted">({{ screen.location }})</span>
                        }
                      </label>
                    }
                  </div>
                }
              </div>
            } @else {
              <div class="form-group">
                <label for="activateGroupId">Select screen group</label>
                <select id="activateGroupId" [(ngModel)]="activateGroupId" name="activateGroupId">
                  <option value="">-- Select a group --</option>
                  @for (group of screenGroups; track group.id) {
                    <option [value]="group.id">
                      {{ group.name }} ({{ group.screens.length }} screens)
                    </option>
                  }
                </select>
              </div>
            }

            @if (activateError) {
              <p class="error">{{ activateError }}</p>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelActivate()">Cancel</button>
              <button class="btn btn-primary" (click)="submitActivate()" [disabled]="activating">
                {{ activating ? 'Activating...' : 'Activate' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class LiveStreams implements OnInit {
  private liveStreamService = inject(LiveStreamService);
  private screenService = inject(ScreenService);
  private screenGroupService = inject(ScreenGroupService);
  private memberService = inject(MemberService);
  private router = inject(Router);

  orgId = '';
  streams: LiveStream[] = [];
  screens: Screen[] = [];
  screenGroups: ScreenGroup[] = [];
  loading = true;
  loadError = '';
  actionError = '';

  // Preset options
  transcodingPresets = TRANSCODING_PRESETS;

  // Create form state
  showCreateForm = false;
  createName = '';
  createSourceUrl = '';
  createProtocol: LiveStreamProtocol = 'rtmp';
  createPreset: TranscodingPreset = 'high_1080p';
  createAudioEnabled = true;
  createError = '';
  creating = false;

  // Edit state
  editingStream: LiveStream | null = null;
  editName = '';
  editSourceUrl = '';
  editProtocol: LiveStreamProtocol = 'rtmp';
  editPreset: TranscodingPreset = 'high_1080p';
  editAudioEnabled = true;
  editError = '';
  saving = false;

  // Delete state
  deletingStream: LiveStream | null = null;
  deleteError = '';
  deleting = false;

  // Activate state
  activatingStream: LiveStream | null = null;
  activateTargetType: 'screens' | 'group' = 'screens';
  activateScreenIds = new Set<string>();
  activateGroupId = '';
  activateError = '';
  activating = false;

  // Passthrough warnings
  passthroughWarnings: string[] = [];

  ngOnInit(): void {
    this.loadCurrentOrg();
  }

  private loadCurrentOrg(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const adminMembership = memberships.find((m) => m.role === 'org_admin');
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.loadData();
        } else if (memberships.length > 0) {
          this.orgId = memberships[0].organisationId;
          this.loadData();
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

  private loadData(): void {
    this.loading = true;
    this.loadError = '';
    this.actionError = '';
    forkJoin({
      streams: this.liveStreamService.getAll(this.orgId),
      screens: this.screenService.getAll(this.orgId),
      groups: this.screenGroupService.getAll(this.orgId),
    }).subscribe({
      next: ({ streams, screens, groups }) => {
        this.streams = streams;
        this.screens = screens;
        this.screenGroups = groups;
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? 'Access denied.' : 'Failed to load live streams.';
        this.loading = false;
      },
    });
  }

  // --- Create ---
  openCreateForm(): void {
    this.createName = '';
    this.createSourceUrl = '';
    this.createProtocol = 'rtmp';
    this.createPreset = 'high_1080p';
    this.createAudioEnabled = true;
    this.createError = '';
    this.showCreateForm = true;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
  }

  submitCreate(): void {
    if (!this.createName) {
      this.createError = 'Name is required.';
      return;
    }
    if (!this.createSourceUrl) {
      this.createError = 'Source URL is required.';
      return;
    }

    this.creating = true;
    this.createError = '';
    const dto: CreateLiveStreamRequest = {
      name: this.createName,
      sourceUrl: this.createSourceUrl,
      protocol: this.createProtocol,
      transcodingPreset: this.createPreset,
      audioEnabled: this.createAudioEnabled,
    };
    this.liveStreamService.create(this.orgId, dto).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.loadData();
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to create live stream.';
        this.creating = false;
      },
    });
  }

  // --- Edit ---
  editStream(stream: LiveStream): void {
    this.editingStream = stream;
    this.editName = stream.name;
    this.editSourceUrl = stream.sourceUrl;
    this.editProtocol = stream.protocol;
    this.editPreset = stream.transcodingPreset;
    this.editAudioEnabled = stream.audioEnabled;
    this.editError = '';
  }

  cancelEdit(): void {
    this.editingStream = null;
  }

  submitEdit(): void {
    if (!this.editingStream) return;
    if (!this.editName) {
      this.editError = 'Name is required.';
      return;
    }
    if (!this.editSourceUrl) {
      this.editError = 'Source URL is required.';
      return;
    }

    this.saving = true;
    this.editError = '';
    const dto: UpdateLiveStreamRequest = {
      name: this.editName,
      sourceUrl: this.editSourceUrl,
      protocol: this.editProtocol,
      transcodingPreset: this.editPreset,
      audioEnabled: this.editAudioEnabled,
    };
    this.liveStreamService.update(this.orgId, this.editingStream.id, dto).subscribe({
      next: () => {
        this.saving = false;
        this.editingStream = null;
        this.loadData();
      },
      error: (err) => {
        this.editError = err.error?.message || 'Failed to update live stream.';
        this.saving = false;
      },
    });
  }

  // --- Delete ---
  confirmDelete(stream: LiveStream): void {
    this.deletingStream = stream;
    this.deleteError = '';
  }

  cancelDelete(): void {
    this.deletingStream = null;
    this.deleteError = '';
  }

  executeDelete(): void {
    if (!this.deletingStream) return;

    this.deleting = true;
    this.deleteError = '';
    this.liveStreamService.delete(this.orgId, this.deletingStream.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deletingStream = null;
        this.loadData();
      },
      error: (err) => {
        this.deleteError = err.error?.message || 'Failed to delete live stream.';
        this.deleting = false;
      },
    });
  }

  // --- Activate ---
  openActivateModal(stream: LiveStream): void {
    this.activatingStream = stream;
    this.activateTargetType = 'screens';
    this.activateScreenIds = new Set<string>();
    this.activateGroupId = '';
    this.activateError = '';
  }

  cancelActivate(): void {
    this.activatingStream = null;
  }

  toggleScreen(screenId: string): void {
    if (this.activateScreenIds.has(screenId)) {
      this.activateScreenIds.delete(screenId);
    } else {
      this.activateScreenIds.add(screenId);
    }
  }

  submitActivate(): void {
    if (!this.activatingStream) return;

    const dto: ActivateLiveStreamRequest = {};

    if (this.activateTargetType === 'screens') {
      if (this.activateScreenIds.size === 0) {
        this.activateError = 'Select at least one screen.';
        return;
      }
      dto.targetScreenIds = Array.from(this.activateScreenIds);
    } else {
      if (!this.activateGroupId) {
        this.activateError = 'Select a screen group.';
        return;
      }
      dto.targetGroupId = this.activateGroupId;
    }

    this.activating = true;
    this.activateError = '';
    this.liveStreamService.activate(this.orgId, this.activatingStream.id, dto).subscribe({
      next: (response: ActivateStreamResponse) => {
        this.activating = false;
        this.activatingStream = null;
        if (response.warnings && response.warnings.length > 0) {
          this.passthroughWarnings = response.warnings;
        }
        this.loadData();
      },
      error: (err) => {
        this.activateError = err.error?.message || 'Failed to activate live stream.';
        this.activating = false;
      },
    });
  }

  // --- Deactivate ---
  deactivateStream(stream: LiveStream): void {
    this.actionError = '';
    this.liveStreamService.deactivate(this.orgId, stream.id).subscribe({
      next: () => this.loadData(),
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to deactivate live stream.';
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  dismissWarnings(): void {
    this.passthroughWarnings = [];
  }

  presetLabel(preset: TranscodingPreset): string {
    return TRANSCODING_PRESET_LABELS[preset] ?? preset;
  }
}
