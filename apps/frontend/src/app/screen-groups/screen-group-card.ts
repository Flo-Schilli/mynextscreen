import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CardComponent, BadgeComponent, IconComponent, IconName, StatusDotComponent } from '../ui';
import { ScreenGroup } from './screen-group.model';

/** One panel in the split layout preview. */
interface SplitPreviewCell {
  row: number;
  col: number;
  assigned: boolean;
  online: boolean;
  /** 1-based panel number, matching the detail view's numbering. */
  panel: number;
}

/** A video wall maxes out at 4×4, so the preview never needs to show more. */
const MAX_PREVIEW_COLS = 4;
const MAX_PREVIEW_ROWS = 4;
const MAX_MIRROR_LAYERS = 3;
/** Below this many rows the cells are too short for a legible dot + number. */
const CELL_META_MAX_ROWS = 2;

/**
 * Presentational screen-group card: gradient icon tile, name + screen count,
 * mode badge, a mini layout preview that mirrors how the group is actually
 * arranged (split = the real grid with assigned cells coloured and empty cells
 * greyed; mirror = stacked frames; no screens = a greyed "No screens" frame),
 * and a trash action. The whole card is clickable to open; the parent owns
 * navigation. The card emits `open` (card click) and `delete` (trash button).
 */
@Component({
  selector: 'app-screen-group-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, BadgeComponent, IconComponent, StatusDotComponent],
  template: `
    <mns-card [hover]="true" [hoverAccent]="true" [clickable]="true">
      <div
        class="cursor-pointer"
        [attr.aria-label]="'Open ' + group().name"
        (click)="open.emit(group())"
        (keydown.enter)="open.emit(group())"
        (keydown.space)="open.emit(group())"
        tabindex="0"
        role="button"
      >
        <div class="flex items-center gap-3 mb-[15px]">
          <span
            class="grid place-items-center w-11 h-11 rounded-xl text-white flex-shrink-0"
            [style.background]="gradient()"
          >
            <mns-icon [name]="iconName()" [size]="22" />
          </span>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-[15.5px] truncate">{{ group().name }}</div>
            <div class="text-[12.5px] text-muted">
              {{ screenCount() }} screen{{ screenCount() === 1 ? '' : 's' }}
            </div>
          </div>
          <mns-badge
            [tone]="group().mode === 'split' ? 'accent' : 'neutral'"
            [icon]="group().mode === 'split' ? 'Grid' : 'Copy'"
          >
            {{ modeLabel() }}
          </mns-badge>
        </div>

        <!-- layout preview (fixed height — never changes the card size) -->
        <div class="h-[58px] mb-3.5">
          @if (isSplit()) {
            <div
              class="grid gap-[2px] h-full p-[2px] rounded-[3px] overflow-hidden"
              style="background: #000"
              [style.grid-template-columns]="'repeat(' + displayCols() + ', 1fr)'"
              [style.grid-template-rows]="'repeat(' + displayRows() + ', 1fr)'"
            >
              @for (cell of splitCells(); track $index) {
                <div
                  class="overflow-hidden relative"
                  [style.background]="cell.assigned ? null : 'var(--surface-3)'"
                >
                  @if (cell.assigned) {
                    <!-- one continuous wall sliced across the panels -->
                    <div [style]="sliceStyle(cell)"></div>
                    <div
                      class="absolute inset-0"
                      style="background: linear-gradient(180deg, rgba(255,255,255,.12), transparent 50%, rgba(0,0,0,.2))"
                    ></div>
                    @if (showCellMeta()) {
                      <span class="absolute top-[3px] right-[4px]">
                        <mns-status-dot [status]="cell.online ? 'online' : 'offline'" [size]="5" />
                      </span>
                    }
                  }
                  @if (showCellMeta()) {
                    <span
                      class="absolute top-[2px] left-[4px] text-[8.5px] font-bold leading-none"
                      [style.color]="cell.assigned ? 'rgba(255,255,255,.9)' : 'var(--text-faint)'"
                      >{{ cell.panel }}</span
                    >
                  }
                </div>
              }
            </div>
          } @else if (mirrorCount() === 0) {
            <div
              class="h-full grid place-items-center rounded-md border border-dashed border-border text-faint text-[11.5px] font-semibold"
              style="background: var(--surface-3)"
            >
              No screens
            </div>
          } @else {
            <div class="relative h-full">
              @for (i of mirrorLayers(); track i) {
                <div
                  class="absolute top-1/2 left-1/2 w-[92px] h-[50px] rounded-md overflow-hidden border border-border shadow-md"
                  [style.background]="gradient()"
                  [style.transform]="mirrorTransform(i)"
                  [style.z-index]="i"
                >
                  @if (i === mirrorCount() - 1) {
                    <div
                      class="absolute inset-0"
                      style="background: linear-gradient(180deg, rgba(255,255,255,.12), transparent 50%, rgba(0,0,0,.2))"
                    ></div>
                  } @else {
                    <div class="absolute inset-0" style="background: rgba(0,0,0,.34)"></div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <div class="flex items-center justify-between">
          <span class="text-[12.5px] text-muted inline-flex items-center gap-1.5">
            <mns-icon name="Image" [size]="14" />{{ contentLabel() }}
          </span>
          <button
            type="button"
            class="grid place-items-center w-8 h-8 rounded-lg border border-border text-muted transition-colors duration-[120ms] hover:text-white hover:bg-offline hover:border-offline"
            [attr.aria-label]="'Delete ' + group().name"
            (click)="onDelete($event)"
          >
            <mns-icon name="Trash" [size]="15" />
          </button>
        </div>
      </div>
    </mns-card>
  `,
})
export class ScreenGroupCard {
  readonly group = input.required<ScreenGroup>();
  readonly open = output<ScreenGroup>();
  readonly delete = output<ScreenGroup>();

  /** Trash button — stop the click bubbling up to the card's `open` handler. */
  protected onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.group());
  }

  readonly iconName = computed<IconName>(() => {
    const allowed: IconName[] = ['Groups', 'Layers', 'Cast', 'Grid', 'Copy', 'Screens'];
    const icon = this.group().icon as IconName;
    return allowed.includes(icon) ? icon : 'Groups';
  });

  readonly gradient = computed(
    () =>
      `linear-gradient(135deg, ${this.group().color}, color-mix(in srgb, ${this.group().color} 55%, #fff))`,
  );

  readonly screenCount = computed(() => this.group().screens.length);

  readonly modeLabel = computed(() => {
    const g = this.group();
    return g.mode === 'split' ? `${g.gridColumns ?? 1}×${g.gridRows ?? 1}` : 'Mirror';
  });

  readonly contentLabel = computed(() => this.group().name.split(' ')[0].toUpperCase().slice(0, 9));

  readonly isSplit = computed(() => this.group().mode === 'split');

  /** Visible grid size, capped at the 4×4 wall maximum. */
  readonly displayCols = computed(() => Math.min(this.group().gridColumns ?? 1, MAX_PREVIEW_COLS));
  readonly displayRows = computed(() => Math.min(this.group().gridRows ?? 1, MAX_PREVIEW_ROWS));

  /** Per-cell dot + number only when cells are tall enough to read them. */
  readonly showCellMeta = computed(() => this.displayRows() <= CELL_META_MAX_ROWS);

  /** Row-major cells for the (capped) split grid, with assignment + status + panel number. */
  readonly splitCells = computed<SplitPreviewCell[]>(() => {
    const g = this.group();
    const fullCols = g.gridColumns ?? 1;
    const cols = this.displayCols();
    const rows = this.displayRows();
    const cells: SplitPreviewCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const screen = g.screens.find((s) => s.gridRow === r && s.gridColumn === c);
        cells.push({
          row: r,
          col: c,
          assigned: !!screen,
          online: screen?.isOnline ?? false,
          panel: r * fullCols + c + 1,
        });
      }
    }
    return cells;
  });

  /**
   * Position the gradient so every assigned panel shows its slice of one shared
   * image (same technique as the detail wall), making adjacent panels line up.
   */
  sliceStyle(cell: SplitPreviewCell): Record<string, string> {
    return {
      position: 'absolute',
      width: `${this.displayCols() * 100}%`,
      height: `${this.displayRows() * 100}%`,
      left: `${-cell.col * 100}%`,
      top: `${-cell.row * 100}%`,
      background: this.gradient(),
    };
  }

  /** How many stacked frames to draw in mirror mode (capped). */
  readonly mirrorCount = computed(() => Math.min(this.group().screens.length, MAX_MIRROR_LAYERS));
  readonly mirrorLayers = computed(() => Array.from({ length: this.mirrorCount() }, (_, i) => i));

  /** Offset each mirror layer so they read as a stack, with the front one centred. */
  mirrorTransform(i: number): string {
    const fromFront = i - (this.mirrorCount() - 1);
    return `translate(calc(-50% + ${fromFront * 9}px), calc(-50% + ${fromFront * -6}px))`;
  }
}
