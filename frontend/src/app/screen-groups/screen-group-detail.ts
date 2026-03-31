import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { ScreenGroupService } from './screen-group.service';
import { ScreenGroup, ScreenGroupMode, ScreenGroupScreen, UpdateScreenGroupRequest } from './screen-group.model';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ContentService } from '../content/content.service';
import { Content } from '../content/content.model';

interface GridCell {
  row: number;
  col: number;
  screen: ScreenGroupScreen | null;
  dropListId: string;
}

@Component({
  selector: 'app-screen-group-detail',
  standalone: true,
  imports: [FormsModule, CdkDrag, CdkDropList, CdkDragPlaceholder],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back to Groups</button>
          @if (group) {
            <h1>{{ group.name }}</h1>
            <span class="mode-badge" [class.mirror]="group.mode === 'mirror'" [class.split]="group.mode === 'split'">
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
        <!-- Split mode: Grid Editor -->
        @if (group.mode === 'split' && group.gridColumns && group.gridRows) {
          <div class="grid-editor-layout">
            <div class="grid-section">
              <h2 class="section-title">Grid Layout ({{ group.gridColumns }}x{{ group.gridRows }})</h2>
              <div class="grid-container"
                   [style.grid-template-columns]="'repeat(' + group.gridColumns + ', 1fr)'"
                   [style.grid-template-rows]="'repeat(' + group.gridRows + ', 1fr)'">
                @for (cell of gridCells; track cell.dropListId) {
                  <div class="grid-cell"
                       cdkDropList
                       [id]="cell.dropListId"
                       [cdkDropListData]="cell"
                       [cdkDropListConnectedTo]="allDropListIds"
                       (cdkDropListDropped)="onDropToCell($event)"
                       [class.occupied]="cell.screen"
                       [class.dropping]="isDroppingOver === cell.dropListId">
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
              @if (loadingScreens) {
                <p class="loading-text">Loading screens...</p>
              } @else if (availableScreens.length === 0) {
                <p class="sidebar-empty">No unassigned screens available.</p>
              } @else {
                <div class="sidebar-list"
                     cdkDropList
                     id="sidebar-list"
                     [cdkDropListData]="availableScreens"
                     [cdkDropListConnectedTo]="allDropListIds"
                     (cdkDropListDropped)="onDropToSidebar($event)">
                  @for (screen of availableScreens; track screen.id) {
                    <div class="sidebar-screen" cdkDrag [cdkDragData]="screen">
                      <div class="sidebar-screen-placeholder" *cdkDragPlaceholder></div>
                      <span class="sidebar-screen-name">{{ screen.name }}</span>
                      @if (screen.groupId && screen.groupId !== group.id) {
                        <span class="already-assigned-badge">In another group</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Wall Preview -->
          @if (allCellsAssigned) {
            <div class="wall-preview-section">
              <h2 class="section-title">Preview Wall</h2>
              <div class="preview-content-picker">
                <label for="previewContentSelect">Select content to preview:</label>
                @if (loadingContent) {
                  <span class="loading-text">Loading content...</span>
                } @else {
                  <select id="previewContentSelect" [(ngModel)]="selectedContentId" (ngModelChange)="onPreviewContentSelect($event)">
                    <option value="">-- Select content --</option>
                    @for (item of contentItems; track item.id) {
                      <option [value]="item.id">{{ item.title }} ({{ item.type }})</option>
                    }
                  </select>
                }
              </div>
              @if (previewImageUrl) {
                <div class="preview-grid"
                     [style.grid-template-columns]="'repeat(' + group.gridColumns + ', 1fr)'"
                     [style.grid-template-rows]="'repeat(' + group.gridRows + ', 1fr)'"
                     [style.aspect-ratio]="previewAspectRatio">
                  @for (cell of gridCells; track cell.dropListId) {
                    <div class="preview-cell"
                         [class.unassigned]="!cell.screen"
                         [style.background-image]="cell.screen ? 'url(' + previewImageUrl + ')' : 'none'"
                         [style.background-size]="getPreviewBgSize()"
                         [style.background-position]="getPreviewBgPosition(cell.col, cell.row)">
                      <span class="preview-label">{{ cell.screen?.name ?? 'Empty' }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- Mirror mode: Simple List -->
        @if (group.mode === 'mirror') {
          <div class="mirror-layout">
            <div class="mirror-section">
              <div class="mirror-header">
                <h2 class="section-title">Assigned Screens ({{ group.screens.length }})</h2>
                <button class="btn btn-primary btn-small" (click)="openAddScreen()">+ Add Screen</button>
              </div>
              @if (group.screens.length === 0) {
                <div class="mirror-empty">
                  <p>No screens assigned to this group yet.</p>
                  <button class="btn btn-primary" (click)="openAddScreen()">Add Screen</button>
                </div>
              } @else {
                <div class="mirror-list">
                  @for (screen of group.screens; track screen.id) {
                    <div class="mirror-screen">
                      <div class="mirror-screen-info">
                        <span class="mirror-screen-name">{{ screen.name }}</span>
                        <span class="mirror-screen-location">{{ screen.location }}</span>
                      </div>
                      <button class="btn btn-small btn-danger" (click)="removeScreenFromGroup(screen.id)" [disabled]="operationInProgress">
                        Remove
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Add Screen Modal (Mirror mode) -->
      @if (showAddScreen) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add Screen"
             tabindex="0" (click)="cancelAddScreen()" (keydown.escape)="cancelAddScreen()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Add Screen to Group</h2>
            @if (loadingScreens) {
              <p class="loading-text">Loading screens...</p>
            } @else if (availableScreens.length === 0) {
              <p class="sidebar-empty">No unassigned screens available.</p>
              <div class="form-actions">
                <button class="btn btn-secondary" (click)="cancelAddScreen()">Close</button>
              </div>
            } @else {
              <div class="add-screen-list">
                @for (screen of availableScreens; track screen.id) {
                  <div class="add-screen-item">
                    <div class="add-screen-info">
                      <span class="add-screen-name">{{ screen.name }}</span>
                      @if (screen.groupId && screen.groupId !== group!.id) {
                        <span class="already-assigned-badge">Already in another group</span>
                      }
                    </div>
                    <button class="btn btn-small btn-primary"
                            (click)="addScreenMirror(screen)"
                            [disabled]="operationInProgress || !!(screen.groupId && screen.groupId !== group!.id)">
                      Add
                    </button>
                  </div>
                }
              </div>
              @if (addScreenError) {
                <p class="error">{{ addScreenError }}</p>
              }
              <div class="form-actions">
                <button class="btn btn-secondary" (click)="cancelAddScreen()">Close</button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Switch Mode Confirmation Modal -->
      @if (showSwitchMode) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Switch mode"
             tabindex="0" (click)="cancelSwitchMode()" (keydown.escape)="cancelSwitchMode()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Switch Mode</h2>
            @if (group!.mode === 'split') {
              <div class="warning-box">
                Switching from Split to Mirror will clear all grid positions for assigned screens. This action cannot be undone.
              </div>
            }
            @if (group!.mode === 'mirror') {
              <div class="form-row">
                <div class="form-group">
                  <label for="switchGridColumns">Grid Columns</label>
                  <input id="switchGridColumns" type="number" [(ngModel)]="switchGridColumns" name="switchGridColumns" required min="1" max="10" />
                </div>
                <div class="form-group">
                  <label for="switchGridRows">Grid Rows</label>
                  <input id="switchGridRows" type="number" [(ngModel)]="switchGridRows" name="switchGridRows" required min="1" max="10" />
                </div>
              </div>
            }
            @if (switchError) {
              <p class="error">{{ switchError }}</p>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelSwitchMode()">Cancel</button>
              <button class="btn btn-primary" (click)="executeSwitchMode()" [disabled]="switching">
                {{ switching ? 'Switching...' : 'Confirm Switch' }}
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
    .btn-small {
      padding: 0.25rem 0.625rem;
      font-size: 0.8125rem;
    }

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

    /* Section Titles */
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
      transition: border-color 0.15s, background-color 0.15s;
      position: relative;
    }
    .grid-cell.occupied {
      border-style: solid;
      border-color: var(--color-accent);
      background: var(--color-accent)08;
    }
    .grid-cell.cdk-drop-list-dragging {
      border-color: var(--color-accent);
      background: var(--color-accent)12;
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
      background: var(--color-accent)20;
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

    /* Mirror Mode */
    .mirror-layout {
      max-width: 40rem;
    }
    .mirror-section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
    }
    .mirror-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .mirror-header .section-title {
      margin: 0;
    }
    .mirror-empty {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--color-text-muted);
    }
    .mirror-empty p {
      margin: 0 0 1rem;
      font-size: 0.875rem;
    }
    .mirror-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .mirror-screen {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
    }
    .mirror-screen-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .mirror-screen-name {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .mirror-screen-location {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    /* Add Screen Modal */
    .add-screen-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 20rem;
      overflow-y: auto;
      margin-bottom: 1rem;
    }
    .add-screen-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.75rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
    }
    .add-screen-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .add-screen-name {
      font-size: 0.875rem;
      font-weight: 500;
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
      width: 100%;
      box-shadow: 0 8px 24px var(--color-shadow);
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

    /* Form */
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

    /* Warning */
    .warning-box {
      background: #92400e20;
      border: 1px solid #92400e;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: #fbbf24;
      line-height: 1.5;
    }

    /* Errors */
    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .action-error {
      background: #991b1b20;
      border: 1px solid #991b1b;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
    }
    .loading-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    /* Wall Preview */
    .wall-preview-section {
      margin-top: 1.5rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
    }
    .preview-content-picker {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .preview-content-picker label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      white-space: nowrap;
    }
    .preview-content-picker select {
      flex: 1;
      max-width: 24rem;
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
      font-size: 0.875rem;
    }
    .preview-content-picker select:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .preview-grid {
      display: grid;
      border: 2px solid var(--color-text-muted);
      border-radius: 0.375rem;
      overflow: hidden;
      max-width: 48rem;
    }
    .preview-cell {
      position: relative;
      border: 1px solid var(--color-text-muted);
      background-repeat: no-repeat;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      min-height: 4rem;
    }
    .preview-cell.unassigned {
      background: repeating-linear-gradient(
        45deg,
        var(--color-bg-tertiary),
        var(--color-bg-tertiary) 8px,
        var(--color-border) 8px,
        var(--color-border) 16px
      );
    }
    .preview-label {
      background: rgba(0, 0, 0, 0.65);
      color: #fff;
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      margin-bottom: 0.25rem;
      max-width: 90%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .page {
        padding: 1rem;
      }
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .grid-editor-layout {
        grid-template-columns: 1fr;
      }
      .form-row {
        grid-template-columns: 1fr;
      }
      .modal {
        min-width: auto;
        margin: 1rem;
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
    if (!this.group || this.group.mode !== 'split' || !this.group.gridColumns || !this.group.gridRows) return false;
    const totalCells = this.group.gridColumns * this.group.gridRows;
    return this.gridCells.length === totalCells && this.gridCells.every(cell => cell.screen !== null);
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
          err.status === 404
            ? 'Screen group not found.'
            : 'Failed to load screen group.';
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
    if (!this.group || this.group.mode !== 'split' || !this.group.gridColumns || !this.group.gridRows) return;

    const cells: GridCell[] = [];
    for (let row = 0; row < this.group.gridRows; row++) {
      for (let col = 0; col < this.group.gridColumns; col++) {
        const screen = this.group.screens.find(
          (s) => s.gridRow === row && s.gridColumn === col
        ) ?? null;
        cells.push({
          row,
          col,
          screen,
          dropListId: `cell-${row}-${col}`,
        });
      }
    }
    this.gridCells = cells;
    this.allDropListIds = [
      'sidebar-list',
      ...cells.map((c) => c.dropListId),
    ];
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

  private moveScreenToCell(screen: ScreenGroupScreen, _sourceCell: GridCell, targetCell: GridCell): void {
    if (!this.group) return;

    // Remove then re-assign at new position
    this.operationInProgress = true;
    this.actionError = '';
    this.screenGroupService
      .removeScreen(this.orgId, this.group.id, screen.id)
      .subscribe({
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
    this.screenGroupService
      .removeScreen(this.orgId, this.group.id, screenId)
      .subscribe({
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
    this.screenGroupService
      .assignScreen(this.orgId, this.group.id, screen.id, {})
      .subscribe({
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

    this.screenGroupService
      .update(this.orgId, this.group.id, dto)
      .subscribe({
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
          (i) => i.transcodingStatus === 'completed' || (i.type === 'image' && i.transcodingStatus !== 'failed'),
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

  getPreviewBgSize(): string {
    if (!this.group?.gridColumns || !this.group?.gridRows) return '100% 100%';
    return `${this.group.gridColumns * 100}% ${this.group.gridRows * 100}%`;
  }

  getPreviewBgPosition(col: number, row: number): string {
    const cols = this.group?.gridColumns ?? 1;
    const rows = this.group?.gridRows ?? 1;
    const xPct = cols > 1 ? (col / (cols - 1)) * 100 : 0;
    const yPct = rows > 1 ? (row / (rows - 1)) * 100 : 0;
    return `${xPct}% ${yPct}%`;
  }

  goBack(): void {
    this.router.navigate(['/screen-groups']);
  }
}
