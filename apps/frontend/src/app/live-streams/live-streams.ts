import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  ],
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
}
