import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LiveStreamService } from './live-stream.service';
import { LiveStream, CreateLiveStreamRequest } from './live-stream.model';
import { LiveStreamCard } from './live-stream-card';
import { LiveStreamCreateModal } from './live-stream-create-modal';
import { LiveStreamDeleteModal } from './live-stream-delete-modal';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ToastService } from '../shared/toast/toast.service';
import { PageHeaderComponent, BtnComponent, EmptyComponent } from '../ui';

/**
 * Smart container for the live-streams list. Owns data loading (streams +
 * screens + groups), the org context, and the list-level HTTP orchestration
 * (create, quick go-live/stop toggle from a card, delete). The cinematic
 * card-grid is delegated to {@link LiveStreamCard}; opening a card navigates to
 * the routed detail console (`live-streams/:id`), which owns rename / activate /
 * deactivate / restart / target selection.
 */
@Component({
  selector: 'app-live-streams',
  standalone: true,
  imports: [
    LiveStreamCard,
    LiveStreamCreateModal,
    LiveStreamDeleteModal,
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

      <!-- Card grid -->
      @if (!loading && streams.length > 0) {
        <div class="stream-grid">
          @for (stream of streams; track stream.id) {
            <app-live-stream-card
              [stream]="stream"
              (open)="openDetail($event)"
              (goToggle)="toggleStream($event)"
              (delete)="confirmDelete($event)"
            />
          }
        </div>
      }

      <!-- Empty State — wrapper class "empty-state" preserved for specs -->
      @if (!loading && streams.length === 0 && !loadError) {
        <div class="empty-state">
          <mns-empty
            icon="Stream"
            title="No live streams"
            desc="Connect an RTMP or RTP source to broadcast live to your network in real time."
          >
            <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">
              Add a stream source
            </mns-btn>
          </mns-empty>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
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
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .stream-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--gap);
    }
    /* 340px min track overflows the shell on phones; go single fluid column. */
    @media (max-width: 420px) {
      .stream-grid {
        grid-template-columns: 1fr;
      }
    }
    .error {
      font-size: 0.875rem;
      color: var(--color-offline);
      padding: 0.75rem 1rem;
      border-radius: var(--r-lg, 10px);
      border: 1px solid color-mix(in srgb, var(--color-offline) 30%, var(--border));
      background: var(--offline-dim);
      margin-bottom: 1rem;
    }
  `,
})
export class LiveStreams implements OnInit {
  private liveStreamService = inject(LiveStreamService);
  private screenService = inject(ScreenService);
  private screenGroupService = inject(ScreenGroupService);
  private memberService = inject(MemberService);
  private toast = inject(ToastService);
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

  // Delete state
  deletingStream: LiveStream | null = null;
  deleteError = '';
  deleting = false;

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
    const live = this.streams.filter((s) => s.status === 'active').length;
    return `${live} live · ${this.streams.length} stream${this.streams.length !== 1 ? 's' : ''}`;
  }

  // --- Navigation ---
  openDetail(stream: LiveStream): void {
    this.router.navigate(['/live-streams', stream.id]);
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

  // --- Quick toggle from a card ---
  toggleStream(stream: LiveStream): void {
    if (stream.status === 'active') {
      this.deactivateStream(stream);
    } else {
      // Targeting is owned by the detail console; route there to pick targets.
      this.openDetail(stream);
    }
  }

  private deactivateStream(stream: LiveStream): void {
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
}
