import { Component, inject, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { LiveStreamService } from './live-stream.service';
import {
  LiveStream,
  CreateLiveStreamRequest,
  UpdateLiveStreamRequest,
  ActivateLiveStreamRequest,
  ActivateStreamResponse,
} from './live-stream.model';
import { LiveStreamTable } from './live-stream-table';
import { LiveStreamCreateModal } from './live-stream-create-modal';
import { LiveStreamEditModal } from './live-stream-edit-modal';
import { LiveStreamDeleteModal } from './live-stream-delete-modal';
import { LiveStreamActivateModal } from './live-stream-activate-modal';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ToastService } from '../shared/toast/toast.service';
import { PageHeaderComponent, BtnComponent, EmptyComponent } from '../ui';

/**
 * Smart container for the live-streams feature. Owns data loading (streams +
 * screens + groups), the org context and all HTTP orchestration (create/edit/
 * delete/activate/deactivate). Presentation is delegated to the table and the
 * create/edit/delete/activate modal children; the small deactivate action and
 * the passthrough-warnings banner stay inline.
 */
@Component({
  selector: 'app-live-streams',
  standalone: true,
  imports: [
    LiveStreamTable,
    LiveStreamCreateModal,
    LiveStreamEditModal,
    LiveStreamDeleteModal,
    LiveStreamActivateModal,
    PageHeaderComponent,
    BtnComponent,
    EmptyComponent,
  ],
  template: `
    <div class="page">
      <mns-page-header title="Live Streams" icon="Stream" [sub]="streamSubtitle">
        @if (!loading && !showCreateForm) {
          <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">New Stream</mns-btn>
        }
      </mns-page-header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <div class="flex items-center justify-center py-20 text-muted text-sm">
          <span
            class="w-5 h-5 rounded-full border-2 border-border border-t-accent animate-spin mr-3"
          ></span>
          Loading live streams…
        </div>
      }

      <!-- Create Stream Modal -->
      @if (showCreateForm) {
        <app-live-stream-create-modal
          [creating]="creating"
          [error]="createError"
          (create)="submitCreate($event)"
          (dismiss)="cancelCreate()"
        />
      }

      <!-- Streams Table -->
      @if (!loading && streams.length > 0) {
        <app-live-stream-table
          [streams]="streams"
          (activate)="openActivateModal($event)"
          (edit)="editStream($event)"
          (delete)="confirmDelete($event)"
          (deactivate)="deactivateStream($event)"
        />
      }

      <!-- Empty State — wrapper class "empty-state" preserved for specs -->
      @if (!loading && streams.length === 0 && !loadError) {
        <div class="empty-state">
          <mns-empty
            icon="Stream"
            title="No live streams yet"
            desc="Create your first live stream to start broadcasting to screens."
          >
            <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">
              Create your first stream
            </mns-btn>
          </mns-empty>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      <!-- Passthrough Warnings Banner — class "warning-banner" preserved for specs -->
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
        <app-live-stream-edit-modal
          [stream]="editingStream"
          [saving]="saving"
          [error]="editError"
          (save)="submitEdit($event)"
          (dismiss)="cancelEdit()"
        />
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingStream) {
        <app-live-stream-delete-modal
          [stream]="deletingStream"
          [deleting]="deleting"
          [error]="deleteError"
          (confirm)="executeDelete()"
          (dismiss)="cancelDelete()"
        />
      }

      <!-- Activate Modal -->
      @if (activatingStream) {
        <app-live-stream-activate-modal
          [stream]="activatingStream"
          [screens]="screens"
          [screenGroups]="screenGroups"
          [activating]="activating"
          [error]="activateError"
          (activate)="submitActivate($event)"
          (dismiss)="cancelActivate()"
        />
      }
    </div>
  `,
  styles: `
    /* Errors */
    .error {
      font-size: 0.875rem;
      color: var(--offline);
      padding: 0.75rem 1rem;
      border-radius: var(--r-lg, 10px);
      border: 1px solid color-mix(in srgb, var(--offline) 30%, var(--border));
      background: var(--offline-dim);
      margin-bottom: 1rem;
    }

    /* Passthrough warnings banner */
    .warning-banner {
      margin-top: 1rem;
      border: 1px solid color-mix(in srgb, var(--warn) 40%, var(--border));
      border-radius: var(--r-lg, 10px);
      background: var(--warn-dim);
      overflow: hidden;
    }
    .warning-banner-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
    }
    .warning-dismiss {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.125rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 0.25rem;
    }
    .warning-dismiss:hover {
      color: var(--text);
    }
    .warning-list {
      margin: 0;
      padding: 0 1rem 0.75rem 1.75rem;
      font-size: 0.8125rem;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    /* Shared btn tokens — matched by specs via .btn-primary/.btn-danger etc. */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border-radius: var(--r-lg, 10px);
      border: none;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary {
      background: var(--accent);
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      opacity: 0.88;
    }
    .btn-secondary {
      background: var(--surface-2);
      color: var(--text);
      border: 1px solid var(--border-strong);
    }
    .btn-secondary:hover:not(:disabled) {
      background: var(--surface-3);
    }
    .btn-danger {
      background: var(--offline);
      color: #fff;
    }
    .btn-danger:hover:not(:disabled) {
      opacity: 0.88;
    }
    .btn-warning {
      background: var(--warn);
      color: #fff;
    }
    .btn-warning:hover:not(:disabled) {
      opacity: 0.88;
    }

    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class LiveStreams implements OnInit {
  private liveStreamService = inject(LiveStreamService);
  private screenService = inject(ScreenService);
  private screenGroupService = inject(ScreenGroupService);
  private memberService = inject(MemberService);
  private toast = inject(ToastService);

  orgId = '';
  streams: LiveStream[] = [];
  screens: Screen[] = [];
  screenGroups: ScreenGroup[] = [];
  loading = true;
  loadError = '';
  actionError = '';

  // Create form state
  showCreateForm = false;
  createError = '';
  creating = false;

  // Edit state
  editingStream: LiveStream | null = null;
  editError = '';
  saving = false;

  // Delete state
  deletingStream: LiveStream | null = null;
  deleteError = '';
  deleting = false;

  // Activate state
  activatingStream: LiveStream | null = null;
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

  get streamSubtitle(): string {
    if (this.loading || !this.streams.length) {
      return 'Ingest a source and override schedules with live video';
    }
    const active = this.streams.filter((s) => s.status === 'active').length;
    return `${this.streams.length} total · ${active} live`;
  }

  // --- Create ---
  openCreateForm(): void {
    this.createError = '';
    this.showCreateForm = true;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
  }

  submitCreate(dto: CreateLiveStreamRequest): void {
    this.creating = true;
    this.createError = '';
    this.liveStreamService.create(this.orgId, dto).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.loadData();
        this.toast.success('Live stream created.');
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
    this.editError = '';
  }

  cancelEdit(): void {
    this.editingStream = null;
  }

  submitEdit(dto: UpdateLiveStreamRequest): void {
    if (!this.editingStream) return;

    this.saving = true;
    this.editError = '';
    this.liveStreamService.update(this.orgId, this.editingStream.id, dto).subscribe({
      next: () => {
        this.saving = false;
        this.editingStream = null;
        this.loadData();
        this.toast.success('Live stream updated.');
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
        this.toast.success('Live stream deleted.');
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
    this.activateError = '';
  }

  cancelActivate(): void {
    this.activatingStream = null;
  }

  submitActivate(dto: ActivateLiveStreamRequest): void {
    if (!this.activatingStream) return;

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
        this.toast.success('Stream started.');
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
      next: () => {
        this.loadData();
        this.toast.success('Stream stopped.');
      },
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to deactivate live stream.';
      },
    });
  }

  dismissWarnings(): void {
    this.passthroughWarnings = [];
  }
}
