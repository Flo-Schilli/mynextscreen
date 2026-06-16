import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScreenGroupService } from './screen-group.service';
import { ScreenGroup, ScreenGroupMode, UpdateScreenGroupRequest } from './screen-group.model';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ToastService } from '../shared/toast/toast.service';
import {
  CardComponent,
  CardHeadComponent,
  BadgeComponent,
  BtnComponent,
  IconComponent,
  IconName,
  StatusDotComponent,
  SelectComponent,
  SelectOption,
  StepperComponent,
} from '../ui';
import { ScreenGroupModeToggle } from './screen-group-mode-toggle';
import { ScreenGroupWall, WallCell, WallPlaceable, WallAssignEvent } from './screen-group-wall';
import { MonitorContent } from './screen-group-monitor-frame';

/** A screen placed in the group, with its split-cell number when applicable. */
interface PlacedScreen {
  screen: { id: string; name: string; location: string; isOnline: boolean };
  cell: number | null;
}

const ALLOWED_ICONS: IconName[] = ['Groups', 'Layers', 'Cast', 'Grid', 'Copy', 'Screens'];

/**
 * Smart container for the screen-group detail page. Owns data loading, the org
 * context, the wall/popover assignment, inline mode+layout edits and the live
 * preview content source. Presentation is delegated to the header/live-preview/
 * display-mode/group-screens cards, the wall and the add-screen modal.
 */
@Component({
  selector: 'app-screen-group-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent,
    CardHeadComponent,
    BadgeComponent,
    BtnComponent,
    IconComponent,
    StatusDotComponent,
    SelectComponent,
    StepperComponent,
    ScreenGroupModeToggle,
    ScreenGroupWall,
  ],
  template: `
    <div class="page">
      @if (loadError()) {
        <p class="text-offline text-sm mb-4">{{ loadError() }}</p>
      }

      @if (loading()) {
        <p class="text-muted text-sm">Loading group details…</p>
      }

      @if (group(); as g) {
        <button
          type="button"
          class="inline-flex items-center gap-[7px] mb-4 pl-[9px] pr-[13px] py-[7px] rounded-[10px] border border-border bg-surface text-muted text-[13.5px] font-semibold"
          (click)="goBack()"
        >
          <mns-icon name="ChevronLeft" [size]="17" /> All groups
        </button>

        <!-- header card -->
        <mns-card>
          <div class="flex items-center gap-4">
            <span
              class="grid place-items-center w-[52px] h-[52px] rounded-[14px] text-white flex-shrink-0"
              [style.background]="gradient()"
            >
              <mns-icon [name]="iconName()" [size]="25" />
            </span>
            <div class="flex-1 min-w-0">
              <div class="text-xl font-extrabold tracking-[-0.01em]">{{ g.name }}</div>
              <div class="flex items-center gap-2.5 mt-1.5 flex-wrap">
                <mns-badge tone="accent" [icon]="g.mode === 'split' ? 'Grid' : 'Copy'">{{
                  modeLabel()
                }}</mns-badge>
                <mns-badge tone="neutral" icon="Screens"
                  >{{ assignedCount() }} screen{{ assignedCount() === 1 ? '' : 's' }}</mns-badge
                >
              </div>
            </div>
            <mns-btn variant="danger" size="sm" icon="Trash" (mnsClick)="onDelete()"
              >Delete</mns-btn
            >
          </div>
        </mns-card>

        @if (actionError()) {
          <p class="text-offline text-sm mt-4">{{ actionError() }}</p>
        }

        <!-- live preview card -->
        <mns-card class="mt-[var(--gap)]">
          <mns-card-head title="Live preview" [sub]="previewSub()" icon="Cast">
            <mns-badge slot="right" tone="neutral" icon="Image">{{ contentLabel() }}</mns-badge>
          </mns-card-head>
          <app-screen-group-wall
            [mode]="g.mode"
            [cols]="g.gridColumns ?? 1"
            [rows]="g.gridRows ?? 1"
            [content]="monitorContent()"
            [cells]="wallCells()"
            [mirrorScreens]="mirrorScreens()"
            [placeable]="placeable()"
            (assign)="onWallAssign($event)"
          />
        </mns-card>

        <div class="grid grid-cols-2 gap-[var(--gap)] items-start mt-[var(--gap)] main-grid">
          <!-- display mode card -->
          <mns-card>
            <mns-card-head
              title="Display mode"
              sub="How content is distributed across the group"
              icon="Layers"
            />
            <app-screen-group-mode-toggle [value]="g.mode" (modeChange)="changeMode($event)" />
            @if (g.mode === 'split') {
              <div
                class="mt-[18px] p-4 rounded-[13px] bg-surface-2 border border-border flex flex-col gap-3.5"
              >
                <div class="text-[13px] font-bold text-muted">Wall layout</div>
                <mns-stepper
                  label="Columns"
                  [(value)]="cols"
                  [min]="1"
                  [max]="4"
                  (valueChange)="commitGrid()"
                />
                <mns-stepper
                  label="Rows"
                  [(value)]="rows"
                  [min]="1"
                  [max]="4"
                  (valueChange)="commitGrid()"
                />
                <div
                  class="flex items-center gap-2 text-[12.5px]"
                  [class.text-online]="assignedCount() >= cellsNeeded()"
                  [class.text-warn]="assignedCount() < cellsNeeded()"
                >
                  <mns-icon
                    [name]="assignedCount() >= cellsNeeded() ? 'CheckCircle' : 'Alert'"
                    [size]="15"
                  />
                  {{ assignedCount() }} of {{ cellsNeeded() }} panels assigned
                </div>
              </div>
            }
          </mns-card>

          <!-- group screens card -->
          <mns-card>
            <mns-card-head
              title="Group screens"
              [sub]="
                g.mode === 'split'
                  ? 'Click a wall panel to place a screen'
                  : 'All mirror the same output'
              "
              icon="Screens"
            />
            <div class="flex flex-col gap-[9px]">
              @if (assignedCount() === 0) {
                <div class="text-[13px] text-muted py-1.5">No screens assigned yet.</div>
              }
              @for (p of placed(); track p.screen.id) {
                <div
                  class="flex items-center gap-[11px] px-[11px] py-[9px] rounded-[11px] bg-surface-2 border border-border"
                >
                  @if (g.mode === 'split' && p.cell !== null) {
                    <span
                      class="mono grid place-items-center w-[26px] h-[26px] rounded-[7px] flex-shrink-0 bg-surface-3 text-[11px] font-bold text-muted"
                      >{{ p.cell + 1 }}</span
                    >
                  }
                  <span class="w-[30px] h-[19px] rounded flex-shrink-0 bg-surface-3"></span>
                  <div class="flex-1 min-w-0">
                    <div class="text-[13.5px] font-semibold truncate">{{ p.screen.name }}</div>
                    <div class="text-[11.5px] text-muted mono">{{ p.screen.location }}</div>
                  </div>
                  <mns-status-dot [status]="p.screen.isOnline ? 'online' : 'offline'" [size]="7" />
                  <button
                    type="button"
                    class="grid place-items-center w-7 h-7 rounded-lg border border-border bg-transparent text-faint hover:text-offline transition-colors"
                    title="Remove"
                    [disabled]="operationInProgress()"
                    (click)="removeScreenFromGroup(p.screen.id)"
                  >
                    <mns-icon name="Trash" [size]="14" />
                  </button>
                </div>
              }
            </div>
            @if (availableScreens().length > 0) {
              <div class="mt-[13px]">
                <mns-select
                  [options]="availableOptions()"
                  [value]="''"
                  placeholder="+ Add a screen to this group…"
                  (changed)="onAddScreenSelect($event)"
                />
              </div>
            }
          </mns-card>
        </div>
      }
    </div>
  `,
  styles: `
    @media (max-width: 880px) {
      .main-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ScreenGroupDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private screenGroupService = inject(ScreenGroupService);
  private screenService = inject(ScreenService);
  private memberService = inject(MemberService);
  private toast = inject(ToastService);

  readonly orgId = signal('');
  readonly group = signal<ScreenGroup | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly operationInProgress = signal(false);

  readonly allScreens = signal<Screen[]>([]);

  // inline grid steppers (split mode)
  readonly cols = signal(2);
  readonly rows = signal(1);

  readonly gradient = computed(() => {
    const g = this.group();
    const color = g?.color || '#6d6cf6';
    return `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #fff))`;
  });

  readonly iconName = computed<IconName>(() => {
    const icon = this.group()?.icon as IconName;
    return ALLOWED_ICONS.includes(icon) ? icon : 'Groups';
  });

  readonly modeLabel = computed(() => {
    const g = this.group();
    if (!g) return '';
    return g.mode === 'split' ? `Split · ${g.gridColumns ?? 1}×${g.gridRows ?? 1}` : 'Mirror';
  });

  readonly contentLabel = computed(
    () => this.group()?.name.split(' ')[0].toUpperCase().slice(0, 9) ?? '',
  );

  readonly monitorContent = computed<MonitorContent | null>(() => {
    const g = this.group();
    if (!g) return null;
    // The preview shows the group's own colour, not arbitrary library content —
    // a screen group has no single "current" content, so a real thumbnail would
    // just be a misleading first-found pick layered under the group label.
    return {
      bg: this.gradient(),
      label: this.contentLabel(),
      type: 'image',
    };
  });

  readonly cellsNeeded = computed(() => {
    const g = this.group();
    if (!g || g.mode !== 'split') return 0;
    return (g.gridColumns ?? 1) * (g.gridRows ?? 1);
  });

  /** Screens actually placed (split keeps cell positions; mirror is a flat list). */
  readonly placed = computed<PlacedScreen[]>(() => {
    const g = this.group();
    if (!g) return [];
    if (g.mode === 'split') {
      const cols = g.gridColumns ?? 1;
      return g.screens
        .filter((s) => s.gridRow !== null && s.gridColumn !== null)
        .map((s) => ({
          screen: this.toPreviewScreen(s.id, s.name, s.location),
          cell: s.gridRow! * cols + s.gridColumn!,
        }))
        .sort((a, b) => (a.cell ?? 0) - (b.cell ?? 0));
    }
    return g.screens.map((s) => ({
      screen: this.toPreviewScreen(s.id, s.name, s.location),
      cell: null,
    }));
  });

  readonly assignedCount = computed(() => this.placed().length);

  readonly availableScreens = computed<Screen[]>(() => {
    const g = this.group();
    if (!g) return [];
    const assigned = new Set(g.screens.map((s) => s.id));
    return this.allScreens().filter((s) => !assigned.has(s.id) && !s.groupId);
  });

  readonly availableOptions = computed<SelectOption[]>(() => [
    { value: '', label: '+ Add a screen to this group…' },
    ...this.availableScreens().map((s) => ({ value: s.id, label: `${s.name} · ${s.location}` })),
  ]);

  readonly placeable = computed<WallPlaceable[]>(() => {
    const g = this.group();
    if (!g) return [];
    // Candidates: org screens free or already in this group.
    return this.allScreens()
      .filter((s) => !s.groupId || s.groupId === g.id)
      .map((s) => ({
        id: s.id,
        name: s.name,
        location: s.location,
        status: s.isOnline ? 'online' : ('offline' as const),
      }));
  });

  readonly mirrorScreens = computed(() => {
    const g = this.group();
    if (!g || g.mode !== 'split') {
      const list = (g?.screens ?? []).map((s) => ({ ...s }));
      return list.length ? list : [null];
    }
    return [null];
  });

  readonly wallCells = computed<WallCell[]>(() => {
    const g = this.group();
    if (!g || g.mode !== 'split') return [];
    const cols = g.gridColumns ?? 1;
    const rows = g.gridRows ?? 1;
    const cells: WallCell[] = [];
    for (let idx = 0; idx < cols * rows; idx++) {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const screen = g.screens.find((s) => s.gridRow === row && s.gridColumn === col) ?? null;
      cells.push({ idx, row, col, screen });
    }
    return cells;
  });

  readonly previewSub = computed(() => {
    const g = this.group();
    if (!g) return '';
    return g.mode === 'split'
      ? `Video wall · ${g.gridColumns ?? 1} columns × ${g.gridRows ?? 1} rows`
      : `Mirrored to ${this.assignedCount()} screen${this.assignedCount() === 1 ? '' : 's'}`;
  });

  ngOnInit(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const m = memberships.find((x) => x.role === 'org_admin') ?? memberships[0];
        if (m) {
          this.orgId.set(m.organisationId);
          this.loadGroup();
          this.loadAllScreens();
        } else {
          this.loadError.set('You are not a member of any organisation.');
          this.loading.set(false);
        }
      },
      error: () => {
        this.loadError.set('Failed to load organisation context.');
        this.loading.set(false);
      },
    });
  }

  private toPreviewScreen(
    id: string,
    name: string,
    location: string,
  ): { id: string; name: string; location: string; isOnline: boolean } {
    const full = this.allScreens().find((s) => s.id === id);
    return { id, name, location, isOnline: full?.isOnline ?? false };
  }

  private loadGroup(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadError.set('No group ID provided.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set('');
    this.screenGroupService.getOne(this.orgId(), id).subscribe({
      next: (group) => {
        this.group.set(group);
        this.cols.set(group.gridColumns ?? 2);
        this.rows.set(group.gridRows ?? 1);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          err.status === 404 ? 'Screen group not found.' : 'Failed to load screen group.',
        );
        this.loading.set(false);
      },
    });
  }

  private loadAllScreens(): void {
    this.screenService.getAll(this.orgId()).subscribe({
      next: (screens) => this.allScreens.set(screens),
      error: () => this.allScreens.set([]),
    });
  }

  private refreshGroup(): void {
    const g = this.group();
    if (!g) return;
    this.screenGroupService.getOne(this.orgId(), g.id).subscribe({
      next: (group) => {
        this.group.set(group);
        this.loadAllScreens();
      },
      error: () => this.actionError.set('Failed to refresh group data.'),
    });
  }

  // --- Wall assignment (split) ---
  onWallAssign(e: WallAssignEvent): void {
    const g = this.group();
    if (!g || this.operationInProgress()) return;

    // The cell currently holds a screen — clear it (or replace it).
    const occupant = g.screens.find((s) => s.gridRow === e.row && s.gridColumn === e.col);

    if (e.screenId === null) {
      if (occupant) this.removeScreenFromGroup(occupant.id);
      return;
    }
    // Re-selecting the same screen in the same cell is a no-op.
    if (occupant && occupant.id === e.screenId) return;

    // Free the screen if it sits in another cell of this group, then assign.
    const elsewhere = g.screens.find((s) => s.id === e.screenId);
    if (elsewhere) {
      this.operationInProgress.set(true);
      this.screenGroupService.removeScreen(this.orgId(), g.id, e.screenId).subscribe({
        next: () => {
          this.operationInProgress.set(false);
          this.assignToCell(e.screenId!, e.row, e.col);
        },
        error: (err) => {
          this.operationInProgress.set(false);
          this.actionError.set(err.error?.message || 'Failed to move screen.');
        },
      });
      return;
    }
    this.assignToCell(e.screenId, e.row, e.col);
  }

  private assignToCell(screenId: string, row: number, col: number): void {
    const g = this.group();
    if (!g) return;
    this.operationInProgress.set(true);
    this.actionError.set('');
    this.screenGroupService
      .assignScreen(this.orgId(), g.id, screenId, { gridRow: row, gridColumn: col })
      .subscribe({
        next: () => {
          this.operationInProgress.set(false);
          this.toast.success('Screen assigned.');
          this.refreshGroup();
        },
        error: (err) => {
          this.operationInProgress.set(false);
          this.actionError.set(err.error?.message || 'Failed to assign screen.');
        },
      });
  }

  // --- Add a screen (mirror via dashed select, or first free split cell) ---
  onAddScreenSelect(screenId: string): void {
    const g = this.group();
    if (!g || !screenId || this.operationInProgress()) return;
    const screen = this.allScreens().find((s) => s.id === screenId);
    if (screen && screen.groupId && screen.groupId !== g.id) {
      this.actionError.set(`Screen "${screen.name}" already belongs to another group.`);
      return;
    }

    if (g.mode === 'split') {
      const cell = this.wallCells().find((c) => !c.screen);
      if (!cell) {
        this.actionError.set('All wall panels are already assigned.');
        return;
      }
      this.assignToCell(screenId, cell.row, cell.col);
      return;
    }

    this.operationInProgress.set(true);
    this.actionError.set('');
    this.screenGroupService.assignScreen(this.orgId(), g.id, screenId, {}).subscribe({
      next: () => {
        this.operationInProgress.set(false);
        this.toast.success('Screen added.');
        this.refreshGroup();
      },
      error: (err) => {
        this.operationInProgress.set(false);
        this.actionError.set(err.error?.message || 'Failed to add screen.');
      },
    });
  }

  removeScreenFromGroup(screenId: string): void {
    const g = this.group();
    if (!g || this.operationInProgress()) return;
    this.operationInProgress.set(true);
    this.actionError.set('');
    this.screenGroupService.removeScreen(this.orgId(), g.id, screenId).subscribe({
      next: () => {
        this.operationInProgress.set(false);
        this.toast.success('Screen removed.');
        this.refreshGroup();
      },
      error: (err) => {
        this.operationInProgress.set(false);
        this.actionError.set(err.error?.message || 'Failed to remove screen.');
      },
    });
  }

  // --- Inline mode + layout ---
  changeMode(mode: ScreenGroupMode): void {
    const g = this.group();
    if (!g || g.mode === mode || this.operationInProgress()) return;
    const dto: UpdateScreenGroupRequest = { mode };
    if (mode === 'split') {
      dto.gridColumns = this.cols();
      dto.gridRows = this.rows();
    }
    this.patchGroup(dto, `Switched to ${mode} mode.`);
  }

  commitGrid(): void {
    const g = this.group();
    if (!g || g.mode !== 'split') return;
    this.patchGroup({ gridColumns: this.cols(), gridRows: this.rows() }, 'Wall layout updated.');
  }

  private patchGroup(dto: UpdateScreenGroupRequest, successMessage: string): void {
    const g = this.group();
    if (!g) return;
    this.operationInProgress.set(true);
    this.actionError.set('');
    this.screenGroupService.update(this.orgId(), g.id, dto).subscribe({
      next: (updated) => {
        this.operationInProgress.set(false);
        this.group.set({ ...updated, screens: updated.screens ?? g.screens });
        this.toast.success(successMessage);
        this.refreshGroup();
      },
      error: (err) => {
        this.operationInProgress.set(false);
        this.actionError.set(err.error?.message || 'Failed to update group.');
      },
    });
  }

  onDelete(): void {
    const g = this.group();
    if (!g || this.operationInProgress()) return;
    if (this.assignedCount() > 0) {
      this.actionError.set('Remove all screens from the group before deleting it.');
      return;
    }
    this.operationInProgress.set(true);
    this.screenGroupService.delete(this.orgId(), g.id).subscribe({
      next: () => {
        this.operationInProgress.set(false);
        this.toast.success('Screen group deleted.');
        this.goBack();
      },
      error: (err) => {
        this.operationInProgress.set(false);
        this.actionError.set(err.error?.message || 'Failed to delete group.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/screen-groups']);
  }
}
