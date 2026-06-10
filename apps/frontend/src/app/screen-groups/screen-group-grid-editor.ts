import { Component, input, output } from '@angular/core';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { ScreenGroupScreen } from './screen-group.model';
import { Screen } from '../screens/screen.model';

/** View-model for one cell of the split-mode grid editor. */
export interface GridCell {
  row: number;
  col: number;
  screen: ScreenGroupScreen | null;
  dropListId: string;
}

/**
 * Split-mode grid editor: a drag-and-drop grid of cells plus a sidebar of
 * available screens. Purely presentational — it emits the raw CDK drop events
 * and the parent owns the assign/move/remove HTTP orchestration.
 */
@Component({
  selector: 'app-screen-group-grid-editor',
  standalone: true,
  imports: [CdkDrag, CdkDropList, CdkDragPlaceholder],
  template: `
    <div class="grid-editor-layout">
      <div class="grid-section">
        <h2 class="section-title">Grid Layout ({{ gridColumns() }}x{{ gridRows() }})</h2>
        <div
          class="grid-container"
          [style.grid-template-columns]="'repeat(' + gridColumns() + ', 1fr)'"
          [style.grid-template-rows]="'repeat(' + gridRows() + ', 1fr)'"
        >
          @for (cell of gridCells(); track cell.dropListId) {
            <div
              class="grid-cell"
              cdkDropList
              [id]="cell.dropListId"
              [cdkDropListData]="cell"
              [cdkDropListConnectedTo]="allDropListIds()"
              (cdkDropListDropped)="dropToCell.emit($event)"
              [class.occupied]="cell.screen"
              [class.dropping]="isDroppingOver() === cell.dropListId"
            >
              @if (cell.screen) {
                <div class="cell-screen" cdkDrag [cdkDragData]="cell.screen">
                  <div class="cell-screen-placeholder" *cdkDragPlaceholder></div>
                  <span class="cell-screen-name">{{ cell.screen.name }}</span>
                  <span class="cell-position">{{ cell.col }},{{ cell.row }}</span>
                </div>
              } @else {
                <div class="cell-empty">
                  <span class="cell-empty-label">Empty</span>
                  <span class="cell-position">{{ cell.col }},{{ cell.row }}</span>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <div class="sidebar-section">
        <h2 class="section-title">Available Screens</h2>
        @if (loadingScreens()) {
          <p class="loading-text">Loading screens...</p>
        } @else if (availableScreens().length === 0) {
          <p class="sidebar-empty">No unassigned screens available.</p>
        } @else {
          <div
            class="sidebar-list"
            cdkDropList
            id="sidebar-list"
            [cdkDropListData]="availableScreens()"
            [cdkDropListConnectedTo]="allDropListIds()"
            (cdkDropListDropped)="dropToSidebar.emit($event)"
          >
            @for (screen of availableScreens(); track screen.id) {
              <div class="sidebar-screen" cdkDrag [cdkDragData]="screen">
                <div class="sidebar-screen-placeholder" *cdkDragPlaceholder></div>
                <span class="sidebar-screen-name">{{ screen.name }}</span>
                @if (screen.groupId && screen.groupId !== groupId()) {
                  <span class="already-assigned-badge">In another group</span>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 1rem;
    }

    /* Grid Editor Layout */
    .grid-editor-layout {
      display: grid;
      grid-template-columns: 1fr 18rem;
      gap: 1.5rem;
      align-items: start;
    }
    .grid-section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
    }
    .grid-container {
      display: grid;
      gap: 0.5rem;
      aspect-ratio: auto;
    }
    .grid-cell {
      border: 2px dashed var(--color-border);
      border-radius: 0.375rem;
      min-height: 5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        border-color 0.15s,
        background-color 0.15s;
      position: relative;
    }
    .grid-cell.occupied {
      border-style: solid;
      border-color: var(--color-accent);
      background: var(--color-accent) 08;
    }
    .grid-cell.cdk-drop-list-dragging {
      border-color: var(--color-accent);
      background: var(--color-accent) 12;
    }
    .cell-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.75rem;
      cursor: grab;
      width: 100%;
      height: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
    .cell-screen:active {
      cursor: grabbing;
    }
    .cell-screen-name {
      font-size: 0.875rem;
      font-weight: 500;
      text-align: center;
      word-break: break-word;
    }
    .cell-position {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }
    .cell-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }
    .cell-empty-label {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .cell-screen-placeholder,
    .sidebar-screen-placeholder {
      background: var(--color-accent) 20;
      border: 2px dashed var(--color-accent);
      border-radius: 0.375rem;
      min-height: 3rem;
    }

    /* CDK Drag styles */
    .cdk-drag-preview {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-accent);
      border-radius: 0.375rem;
      padding: 0.5rem 1rem;
      box-shadow: 0 4px 12px var(--color-shadow);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-primary);
    }
    .cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    /* Sidebar */
    .sidebar-section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
    }
    .sidebar-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 3rem;
    }
    .sidebar-screen {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.75rem;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      cursor: grab;
      transition: border-color 0.15s;
    }
    .sidebar-screen:hover {
      border-color: var(--color-accent);
    }
    .sidebar-screen:active {
      cursor: grabbing;
    }
    .sidebar-screen-name {
      font-size: 0.8125rem;
      font-weight: 500;
    }
    .sidebar-empty {
      color: var(--color-text-muted);
      font-size: 0.8125rem;
    }
    .already-assigned-badge {
      font-size: 0.6875rem;
      color: #f59e0b;
      background: #f59e0b18;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }

    @media (max-width: 768px) {
      .grid-editor-layout {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ScreenGroupGridEditor {
  readonly gridCells = input.required<GridCell[]>();
  readonly availableScreens = input.required<Screen[]>();
  readonly allDropListIds = input.required<string[]>();
  readonly loadingScreens = input.required<boolean>();
  readonly gridColumns = input.required<number | null>();
  readonly gridRows = input.required<number | null>();
  readonly groupId = input.required<string>();
  readonly isDroppingOver = input<string>('');

  readonly dropToCell = output<CdkDragDrop<GridCell, GridCell>>();
  readonly dropToSidebar = output<CdkDragDrop<Screen[], GridCell>>();
}
