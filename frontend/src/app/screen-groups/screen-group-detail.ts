import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ScreenGroupService } from './screen-group.service';
import {
  ScreenGroup,
  ScreenGroupMode,
  ScreenGroupScreen,
  UpdateScreenGroupRequest,
} from './screen-group.model';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ContentService } from '../content/content.service';
import { Content } from '../content/content.model';
import { ScreenGroupGridEditor, GridCell } from './screen-group-grid-editor';
import { ScreenGroupWallPreview } from './screen-group-wall-preview';
import { ScreenGroupMirrorList } from './screen-group-mirror-list';
import { ScreenGroupAddScreenModal } from './screen-group-add-screen-modal';
import { ScreenGroupSwitchModeModal } from './screen-group-switch-mode-modal';

/**
 * Smart container for the screen-group detail page. Owns data loading, the org
 * context, grid construction, all assign/move/remove/switch HTTP orchestration,
 * and the wall-preview thumbnail extraction. Presentation is delegated to the
 * grid-editor, wall-preview, mirror-list and modal children.
 */
@Component({
  selector: 'app-screen-group-detail',
  standalone: true,
  imports: [
    ScreenGroupGridEditor,
    ScreenGroupWallPreview,
    ScreenGroupMirrorList,
    ScreenGroupAddScreenModal,
    ScreenGroupSwitchModeModal,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back to Groups</button>
          @if (group) {
            <h1>{{ group.name }}</h1>
            <span
              class="mode-badge"
              [class.mirror]="group.mode === 'mirror'"
              [class.split]="group.mode === 'split'"
            >
              {{ group.mode === 'mirror' ? 'Mirror' : 'Split' }}
            </span>
          }
        </div>
        @if (group) {
          <button class="btn btn-secondary" (click)="openSwitchMode()">
            Switch to {{ group.mode === 'mirror' ? 'Split' : 'Mirror' }}
          </button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading group details...</p>
      }

      @if (actionError) {
        <p class="error action-error">{{ actionError }}</p>
      }

      @if (group && !loading) {
        <!-- Split mode: Grid Editor + Wall Preview -->
        @if (group.mode === 'split' && group.gridColumns && group.gridRows) {
          <app-screen-group-grid-editor
            [gridCells]="gridCells"
            [availableScreens]="availableScreens"
            [allDropListIds]="allDropListIds"
            [loadingScreens]="loadingScreens"
            [gridColumns]="group.gridColumns"
            [gridRows]="group.gridRows"
            [groupId]="group.id"
            [isDroppingOver]="isDroppingOver"
            (dropToCell)="onDropToCell($event)"
            (dropToSidebar)="onDropToSidebar($event)"
          />

          @if (allCellsAssigned) {
            <app-screen-group-wall-preview
              [gridCells]="gridCells"
              [gridColumns]="group.gridColumns"
              [gridRows]="group.gridRows"
              [contentItems]="contentItems"
              [loadingContent]="loadingContent"
              [previewImageUrl]="previewImageUrl"
              [previewAspectRatio]="previewAspectRatio"
              [(selectedContentId)]="selectedContentId"
              (selectContent)="onPreviewContentSelect($event)"
            />
          }
        }

        <!-- Mirror mode: Simple List -->
        @if (group.mode === 'mirror') {
          <app-screen-group-mirror-list
            [screens]="group.screens"
            [operationInProgress]="operationInProgress"
            (addScreen)="openAddScreen()"
            (removeScreen)="removeScreenFromGroup($event)"
          />
        }
      }

      <!-- Add Screen Modal (Mirror mode) -->
      @if (showAddScreen && group) {
        <app-screen-group-add-screen-modal
          [availableScreens]="availableScreens"
          [loadingScreens]="loadingScreens"
          [error]="addScreenError"
          [groupId]="group.id"
          [operationInProgress]="operationInProgress"
          (add)="addScreenMirror($event)"
          (dismiss)="cancelAddScreen()"
        />
      }

      <!-- Switch Mode Confirmation Modal -->
      @if (showSwitchMode && group) {
        <app-screen-group-switch-mode-modal
          [mode]="group.mode"
          [switching]="switching"
          [error]="switchError"
          [(gridColumns)]="switchGridColumns"
          [(gridRows)]="switchGridRows"
          (confirm)="executeSwitchMode()"
          (dismiss)="cancelSwitchMode()"
        />
      }
    </div>
  `,
  styles: `
    /* Mode Badge */
    .mode-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .mode-badge.mirror {
      background: #3b82f620;
      color: #3b82f6;
    }
    .mode-badge.split {
      background: #a855f720;
      color: #a855f7;
    }

    /* Errors */
    .action-error {
      background: #991b1b20;
      border: 1px solid #991b1b;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
    }
  `,
})
export class ScreenGroupDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private screenGroupService = inject(ScreenGroupService);
  private screenService = inject(ScreenService);
  private memberService = inject(MemberService);
  private contentService = inject(ContentService);

  orgId = '';
  group: ScreenGroup | null = null;
  loading = true;
  loadError = '';
  actionError = '';
  operationInProgress = false;

  // All org screens (for available list)
  allScreens: Screen[] = [];
  loadingScreens = true;

  // Grid state (split mode)
  gridCells: GridCell[] = [];
  allDropListIds: string[] = [];
  isDroppingOver = '';

  // Add screen modal (mirror mode)
  showAddScreen = false;
  addScreenError = '';

  // Switch mode
  showSwitchMode = false;
  switchGridColumns = 2;
  switchGridRows = 2;
  switchError = '';
  switching = false;

  // Wall preview state
  contentItems: Content[] = [];
  loadingContent = false;
  selectedContentId = '';
  selectedContent: Content | null = null;
  previewImageUrl: string | null = null;
  previewAspectRatio = '16 / 9';

  get allCellsAssigned(): boolean {
    if (
      !this.group ||
      this.group.mode !== 'split' ||
      !this.group.gridColumns ||
      !this.group.gridRows
    )
      return false;
    const totalCells = this.group.gridColumns * this.group.gridRows;
    return (
      this.gridCells.length === totalCells && this.gridCells.every((cell) => cell.screen !== null)
    );
  }

  ngOnInit(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const m = memberships.find((m) => m.role === 'org_admin') ?? memberships[0];
        if (m) {
          this.orgId = m.organisationId;
          this.loadGroup();
          this.loadAllScreens();
          this.loadContentItems();
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

  private loadGroup(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadError = 'No group ID provided.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.loadError = '';
    this.screenGroupService.getOne(this.orgId, id).subscribe({
      next: (group) => {
        this.group = group;
        this.loading = false;
        if (group.mode === 'split') {
          this.buildGrid();
        }
      },
      error: (err) => {
        this.loadError =
          err.status === 404 ? 'Screen group not found.' : 'Failed to load screen group.';
        this.loading = false;
      },
    });
  }

  private loadAllScreens(): void {
    this.loadingScreens = true;
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.allScreens = screens;
        this.loadingScreens = false;
        if (this.group?.mode === 'split') {
          this.buildGrid();
        }
      },
      error: () => {
        this.loadingScreens = false;
      },
    });
  }

  get availableScreens(): Screen[] {
    if (!this.group) return [];
    const assignedIds = new Set(this.group.screens.map((s) => s.id));
    return this.allScreens.filter((s) => !assignedIds.has(s.id));
  }

  // --- Grid Builder ---
  private buildGrid(): void {
    if (
      !this.group ||
      this.group.mode !== 'split' ||
      !this.group.gridColumns ||
      !this.group.gridRows
    )
      return;

    const cells: GridCell[] = [];
    for (let row = 0; row < this.group.gridRows; row++) {
      for (let col = 0; col < this.group.gridColumns; col++) {
        const screen =
          this.group.screens.find((s) => s.gridRow === row && s.gridColumn === col) ?? null;
        cells.push({
          row,
          col,
          screen,
          dropListId: `cell-${row}-${col}`,
        });
      }
    }
    this.gridCells = cells;
    this.allDropListIds = ['sidebar-list', ...cells.map((c) => c.dropListId)];
  }

  // --- Drag & Drop (Split Mode) ---
  onDropToCell(event: CdkDragDrop<GridCell, GridCell>): void {
    if (this.operationInProgress) return;
    const targetCell = event.container.data as GridCell;
    const screen: ScreenGroupScreen | Screen = event.item.data;

    // Dropped on an occupied cell — do nothing
    if (targetCell.screen && targetCell.screen.id !== screen.id) return;

    // Determine source
    const sourceContainerId = event.previousContainer.id;

    if (sourceContainerId === 'sidebar-list') {
      // From sidebar to grid cell — assign
      this.assignScreenToCell(screen, targetCell);
    } else {
      // From another cell — move
      const sourceCell = event.previousContainer.data as GridCell;
      if (sourceCell.dropListId === targetCell.dropListId) return; // same cell
      this.moveScreenToCell(screen as ScreenGroupScreen, sourceCell, targetCell);
    }
  }

  onDropToSidebar(event: CdkDragDrop<Screen[], GridCell>): void {
    if (this.operationInProgress) return;
    const sourceContainerId = event.previousContainer.id;
    if (sourceContainerId === 'sidebar-list') return; // already in sidebar

    const screen: ScreenGroupScreen = event.item.data;
    this.removeScreenFromGroup(screen.id);
  }

  private assignScreenToCell(screen: ScreenGroupScreen | Screen, cell: GridCell): void {
    if (!this.group) return;

    // Validate not in another group
    const fullScreen = this.allScreens.find((s) => s.id === screen.id);
    if (fullScreen && fullScreen.groupId && fullScreen.groupId !== this.group.id) {
      this.actionError = `Screen "${screen.name}" already belongs to another group.`;
      return;
    }

    this.operationInProgress = true;
    this.actionError = '';
    this.screenGroupService
      .assignScreen(this.orgId, this.group.id, screen.id, {
        gridRow: cell.row,
        gridColumn: cell.col,
      })
      .subscribe({
        next: () => {
          this.operationInProgress = false;
          this.refreshGroup();
        },
        error: (err) => {
          this.actionError = err.error?.message || 'Failed to assign screen.';
          this.operationInProgress = false;
        },
      });
  }

  private moveScreenToCell(
    screen: ScreenGroupScreen,
    _sourceCell: GridCell,
    targetCell: GridCell,
  ): void {
    if (!this.group) return;

    // Remove then re-assign at new position
    this.operationInProgress = true;
    this.actionError = '';
    this.screenGroupService.removeScreen(this.orgId, this.group.id, screen.id).subscribe({
      next: () => {
        this.screenGroupService
          .assignScreen(this.orgId, this.group!.id, screen.id, {
            gridRow: targetCell.row,
            gridColumn: targetCell.col,
          })
          .subscribe({
            next: () => {
              this.operationInProgress = false;
              this.refreshGroup();
            },
            error: (err) => {
              this.actionError = err.error?.message || 'Failed to move screen.';
              this.operationInProgress = false;
              this.refreshGroup();
            },
          });
      },
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to move screen.';
        this.operationInProgress = false;
      },
    });
  }

  // --- Remove Screen ---
  removeScreenFromGroup(screenId: string): void {
    if (!this.group || this.operationInProgress) return;

    this.operationInProgress = true;
    this.actionError = '';
    this.screenGroupService.removeScreen(this.orgId, this.group.id, screenId).subscribe({
      next: () => {
        this.operationInProgress = false;
        this.refreshGroup();
      },
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to remove screen.';
        this.operationInProgress = false;
      },
    });
  }

  // --- Mirror Mode: Add Screen ---
  openAddScreen(): void {
    this.addScreenError = '';
    this.showAddScreen = true;
    if (this.allScreens.length === 0) {
      this.loadAllScreens();
    }
  }

  cancelAddScreen(): void {
    this.showAddScreen = false;
  }

  addScreenMirror(screen: Screen): void {
    if (!this.group || this.operationInProgress) return;

    // Check if screen belongs to another group
    if (screen.groupId && screen.groupId !== this.group.id) {
      this.addScreenError = `Screen "${screen.name}" already belongs to another group.`;
      return;
    }

    this.operationInProgress = true;
    this.addScreenError = '';
    this.screenGroupService.assignScreen(this.orgId, this.group.id, screen.id, {}).subscribe({
      next: () => {
        this.operationInProgress = false;
        this.refreshGroup();
      },
      error: (err) => {
        this.addScreenError = err.error?.message || 'Failed to add screen.';
        this.operationInProgress = false;
      },
    });
  }

  // --- Switch Mode ---
  openSwitchMode(): void {
    this.switchError = '';
    this.switchGridColumns = this.group?.gridColumns ?? 2;
    this.switchGridRows = this.group?.gridRows ?? 2;
    this.showSwitchMode = true;
  }

  cancelSwitchMode(): void {
    this.showSwitchMode = false;
  }

  executeSwitchMode(): void {
    if (!this.group) return;

    const newMode: ScreenGroupMode = this.group.mode === 'mirror' ? 'split' : 'mirror';

    if (newMode === 'split' && (!this.switchGridColumns || !this.switchGridRows)) {
      this.switchError = 'Grid columns and rows are required for split mode.';
      return;
    }

    this.switching = true;
    this.switchError = '';

    const dto: UpdateScreenGroupRequest = { mode: newMode };
    if (newMode === 'split') {
      dto.gridColumns = this.switchGridColumns;
      dto.gridRows = this.switchGridRows;
    }

    this.screenGroupService.update(this.orgId, this.group.id, dto).subscribe({
      next: () => {
        this.switching = false;
        this.showSwitchMode = false;
        this.refreshGroup();
      },
      error: (err) => {
        this.switchError = err.error?.message || 'Failed to switch mode.';
        this.switching = false;
      },
    });
  }

  // --- Helpers ---
  private refreshGroup(): void {
    if (!this.group) return;
    this.screenGroupService.getOne(this.orgId, this.group.id).subscribe({
      next: (group) => {
        this.group = group;
        if (group.mode === 'split') {
          this.buildGrid();
        }
        this.loadAllScreens();
      },
      error: () => {
        this.actionError = 'Failed to refresh group data.';
      },
    });
  }

  // --- Wall Preview ---
  private loadContentItems(): void {
    this.loadingContent = true;
    this.contentService.getAll(this.orgId).subscribe({
      next: (items) => {
        this.contentItems = items.filter(
          (i) =>
            i.transcodingStatus === 'completed' ||
            (i.type === 'image' && i.transcodingStatus !== 'failed'),
        );
        this.loadingContent = false;
      },
      error: () => {
        this.loadingContent = false;
      },
    });
  }

  onPreviewContentSelect(contentId: string): void {
    if (!contentId) {
      this.selectedContent = null;
      this.previewImageUrl = null;
      return;
    }
    const content = this.contentItems.find((c) => c.id === contentId);
    if (!content) return;
    this.selectedContent = content;

    const url = this.getContentPreviewUrl(content);

    if (content.type === 'image') {
      const img = new Image();
      img.onload = () => {
        this.previewAspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
        this.previewImageUrl = url;
      };
      img.onerror = () => {
        this.previewAspectRatio = '16 / 9';
        this.previewImageUrl = url;
      };
      img.src = url;
    } else {
      this.extractVideoThumbnail(url);
    }
  }

  private extractVideoThumbnail(url: string): void {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';
    video.onloadeddata = () => {
      video.currentTime = 0;
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        this.previewAspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
        this.previewImageUrl = canvas.toDataURL('image/jpeg');
      }
    };
    video.onerror = () => {
      this.previewAspectRatio = '16 / 9';
      this.previewImageUrl = url;
    };
    video.src = url;
  }

  private getContentPreviewUrl(content: Content): string {
    if (content.transcodingStatus === 'completed') {
      return this.contentService.getTranscodedUrl(content.id);
    }
    return this.contentService.getOriginalUrl(content.id);
  }

  goBack(): void {
    this.router.navigate(['/screen-groups']);
  }
}
