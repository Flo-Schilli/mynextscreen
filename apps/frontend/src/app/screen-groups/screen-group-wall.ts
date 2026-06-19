import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IconComponent, StatusDotComponent } from '../ui';
import { ScreenGroupScreen } from './screen-group.model';
import { ScreenGroupMonitorFrame, MonitorContent } from './screen-group-monitor-frame';

/** One wall cell view-model. */
export interface WallCell {
  /** Linear panel index (row-major). */
  idx: number;
  row: number;
  col: number;
  screen: ScreenGroupScreen | null;
}

/** Screen choice shown inside a cell popover. */
export interface WallPlaceable {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
}

/** Emitted when a cell's assignment changes; `screenId` null means "leave empty". */
export interface WallAssignEvent {
  row: number;
  col: number;
  idx: number;
  screenId: string | null;
}

/**
 * Video-wall surface. In split mode it renders a MonitorFrame grid where each
 * cell is a clickable popover (assign a screen / leave empty); in mirror mode it
 * renders a flat, centred row of frames. Presentational — the parent owns the
 * group data and runs the assign/remove HTTP calls from the emitted events.
 */
@Component({
  selector: 'app-screen-group-wall',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, StatusDotComponent, ScreenGroupMonitorFrame],
  template: `
    <div class="wall-mount">
      @if (mode() === 'mirror') {
        <div class="mirror-row">
          @for (s of mirrorScreens(); track s?.id ?? $index) {
            <div class="mirror-frame">
              <app-screen-group-monitor-frame
                [content]="content()"
                [label]="s ? s.name : 'No screens yet'"
                [status]="s ? statusOf(s) : 'offline'"
              />
            </div>
          }
        </div>
        <div class="caption">Every screen mirrors the same content, perfectly in sync.</div>
      } @else {
        <div class="split-wrap" [class.wide]="cols() >= rows()">
          <div
            class="split-grid"
            [style.grid-template-columns]="'repeat(' + cols() + ', 1fr)'"
            [style.grid-template-rows]="'repeat(' + rows() + ', 1fr)'"
            [style.aspect-ratio]="cols() * 16 + ' / ' + rows() * 9"
          >
            @for (cell of cells(); track cell.idx) {
              <div class="cell" [style.z-index]="openCell() === cell.idx ? 20 : 1">
                <app-screen-group-monitor-frame
                  [content]="content()"
                  [slice]="{ r: cell.row, c: cell.col, rows: rows(), cols: cols() }"
                  [label]="cell.screen ? cell.screen.name : null"
                  [status]="cell.screen ? statusOf(cell.screen) : 'online'"
                  [empty]="!cell.screen"
                  [square]="true"
                >
                  <button
                    type="button"
                    class="cell-hit"
                    [class.active]="openCell() === cell.idx"
                    title="Assign a screen to this panel"
                    [attr.aria-label]="'Assign a screen to panel ' + (cell.idx + 1)"
                    (click)="toggle(cell.idx)"
                  ></button>
                  <span class="cell-pencil" [class.active]="openCell() === cell.idx">
                    <mns-icon name="Pencil" [size]="12" />
                  </span>
                </app-screen-group-monitor-frame>

                @if (openCell() === cell.idx) {
                  <button
                    type="button"
                    class="popover-scrim"
                    aria-label="Close menu"
                    (click)="close()"
                  ></button>
                  <div class="popover" [class.upward]="isUpward(cell)">
                    <div class="popover-head">
                      Panel {{ cell.idx + 1 }} · Row {{ cell.row + 1 }} · Col {{ cell.col + 1 }}
                    </div>
                    <div class="popover-body">
                      @if (cell.screen) {
                        <button type="button" class="menu-item" (click)="leaveEmpty(cell)">
                          <span class="menu-trash"><mns-icon name="Trash" [size]="13" /></span>
                          <span class="menu-empty-label">Leave empty</span>
                        </button>
                      }
                      @for (s of placeableFor(cell); track s.id) {
                        <button
                          type="button"
                          class="menu-item"
                          [class.selected]="cell.screen?.id === s.id"
                          (click)="assignTo(cell, s.id)"
                        >
                          <span class="menu-thumb"></span>
                          <span class="menu-text">
                            <span class="menu-name" [class.is-sel]="cell.screen?.id === s.id">{{
                              s.name
                            }}</span>
                            <span class="menu-loc">{{ s.location }}</span>
                          </span>
                          <mns-status-dot [status]="s.status" [size]="7" />
                          @if (cell.screen?.id === s.id) {
                            <mns-icon name="Check" [size]="15" class="text-accent" />
                          }
                        </button>
                      }
                      @if (placeableFor(cell).length === 0 && !cell.screen) {
                        <div class="menu-none">All screens are already placed.</div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
        <div class="caption">
          One source split across a {{ cols() }}×{{ rows() }} wall — click any panel to place its
          screen.
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .wall-mount {
      padding: 16px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: radial-gradient(130% 130% at 50% -10%, #0d1320, #06080d);
    }
    .mirror-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
    }
    .mirror-frame {
      flex: 1 1 200px;
      max-width: 240px;
      aspect-ratio: 16 / 9;
    }
    .caption {
      text-align: center;
      margin-top: 13px;
      font-size: 12.5px;
      color: var(--text-faint);
    }
    .split-wrap {
      /* Mobile-first: fill the available width; cap only at tablet+ (md). */
      width: 100%;
      margin: 0 auto;
    }
    @media (min-width: 768px) {
      .split-wrap {
        max-width: 420px;
      }
      .split-wrap.wide {
        max-width: 680px;
      }
    }
    .split-grid {
      display: grid;
      gap: 3px;
      width: 100%;
      /* uniform thin bezels (gap + padding) framing the whole wall */
      padding: 3px;
      background: #000;
      border-radius: 4px;
      box-shadow: 0 18px 40px -22px rgba(0, 0, 0, 0.95);
    }
    .cell {
      position: relative;
    }
    .cell-hit {
      position: absolute;
      inset: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 0;
      transition: box-shadow 0.15s;
      z-index: 2;
    }
    .cell-hit:hover,
    .cell-hit.active {
      box-shadow: inset 0 0 0 2px var(--accent);
    }
    .cell-pencil {
      position: absolute;
      top: 6px;
      right: 6px;
      pointer-events: none;
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 7px;
      color: #fff;
      transition: background 0.15s;
      background: rgba(4, 6, 11, 0.62);
      backdrop-filter: blur(4px);
      z-index: 3;
    }
    .cell:hover .cell-pencil,
    .cell-pencil.active {
      background: var(--accent);
    }
    .popover-scrim {
      position: fixed;
      inset: 0;
      z-index: 10;
      border: none;
      /* Mobile: dimmed backdrop behind the bottom sheet. */
      background: rgba(4, 6, 11, 0.55);
      cursor: default;
    }
    /* Mobile-first: render the menu as a bottom sheet anchored to the viewport
       bottom so it never overflows the screen edge. Free-positioned popover is
       restored at tablet+ (md) below. */
    .popover {
      position: fixed;
      z-index: 30;
      left: 0;
      right: 0;
      bottom: 0;
      max-width: 100%;
      max-height: 80dvh;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-bottom: none;
      border-radius: 16px 16px 0 0;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      animation: sheetUp 0.18s ease both;
    }
    @media (min-width: 768px) {
      .popover-scrim {
        background: transparent;
      }
      .popover {
        position: absolute;
        left: 0;
        right: auto;
        min-width: min(264px, 80vw);
        max-width: 300px;
        max-height: none;
        top: calc(100% + 8px);
        bottom: auto;
        border: 1px solid var(--border-strong);
        border-radius: 14px;
        animation: fadeUp 0.16s ease both;
      }
      .popover.upward {
        top: auto;
        bottom: calc(100% + 8px);
      }
    }
    @keyframes sheetUp {
      from {
        transform: translateY(12px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .popover {
        animation: none;
      }
    }
    .popover-head {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--text-faint);
    }
    .popover-body {
      max-height: 244px;
      overflow-y: auto;
      padding: 6px;
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 10px;
      border-radius: 9px;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
    }
    .menu-item:hover {
      background: var(--hover);
    }
    .menu-item.selected {
      background: var(--accent-soft);
    }
    .menu-trash {
      display: grid;
      place-items: center;
      width: 30px;
      height: 22px;
      border-radius: 5px;
      flex-shrink: 0;
      background: var(--surface-3);
      color: var(--text-faint);
    }
    .menu-empty-label {
      flex: 1;
      font-size: 13.5px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .menu-thumb {
      width: 30px;
      height: 22px;
      border-radius: 5px;
      flex-shrink: 0;
      background: var(--surface-3);
    }
    .menu-text {
      flex: 1;
      min-width: 0;
    }
    .menu-name {
      display: block;
      font-size: 13.5px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text);
    }
    .menu-name.is-sel {
      color: var(--accent);
    }
    .menu-loc {
      display: block;
      font-size: 11.5px;
      color: var(--text-muted);
    }
    .menu-none {
      padding: 12px 10px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .text-accent {
      color: var(--accent);
    }
  `,
})
export class ScreenGroupWall {
  readonly mode = input.required<'mirror' | 'split'>();
  readonly cols = input<number>(1);
  readonly rows = input<number>(1);
  readonly content = input<MonitorContent | null>(null);
  /** Cells for split mode (row-major, length === cols*rows). */
  readonly cells = input<WallCell[]>([]);
  /** Screens assigned in mirror mode. */
  readonly mirrorScreens = input<(ScreenGroupScreen | null)[]>([]);
  /** All org screens that may be placed (already-placed ones are filtered per-cell). */
  readonly placeable = input<WallPlaceable[]>([]);

  readonly assign = output<WallAssignEvent>();

  readonly openCell = signal<number | null>(null);

  readonly placeableIds = computed(() => new Set(this.cells().map((c) => c.screen?.id)));

  statusOf(s: ScreenGroupScreen): 'online' | 'offline' {
    const p = this.placeable().find((x) => x.id === s.id);
    return p?.status ?? 'online';
  }

  /** Screens selectable for a cell: unplaced screens plus the one already in this cell. */
  placeableFor(cell: WallCell): WallPlaceable[] {
    const placedElsewhere = new Set(
      this.cells()
        .filter((c) => c.idx !== cell.idx && c.screen)
        .map((c) => c.screen!.id),
    );
    return this.placeable().filter((s) => !placedElsewhere.has(s.id));
  }

  isUpward(cell: WallCell): boolean {
    return cell.row >= this.rows() - 1 && this.rows() > 1;
  }

  toggle(idx: number): void {
    this.openCell.update((v) => (v === idx ? null : idx));
  }

  close(): void {
    this.openCell.set(null);
  }

  assignTo(cell: WallCell, screenId: string): void {
    this.assign.emit({ row: cell.row, col: cell.col, idx: cell.idx, screenId });
    this.close();
  }

  leaveEmpty(cell: WallCell): void {
    this.assign.emit({ row: cell.row, col: cell.col, idx: cell.idx, screenId: null });
    this.close();
  }
}
