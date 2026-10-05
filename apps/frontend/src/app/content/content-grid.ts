import { Component, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Content } from './content.model';
import { ContentFormatService } from './content-format.service';
import { SelectionService } from '../shared/selection/selection.service';
import { SelectionCheckboxComponent } from '../shared/selection/selection-checkbox';
import { SelectAllCheckboxComponent } from '../shared/selection/select-all-checkbox';
import { BulkActionToolbarComponent, BulkAction } from '../shared/selection/bulk-action-toolbar';

/**
 * Presentational content grid: select-all header, the card grid with
 * transcoding overlays, and the bulk-action toolbar. Reads the
 * parent-provided {@link SelectionService} instance and emits the clicked item;
 * the parent owns data loading and the bulk-action handlers.
 */
@Component({
  selector: 'app-content-grid',
  standalone: true,
  imports: [
    SelectionCheckboxComponent,
    SelectAllCheckboxComponent,
    BulkActionToolbarComponent,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <div class="grid-header">
        <app-select-all-checkbox [allIds]="contentIds()" />
      </div>
      <div class="content-grid">
        @for (item of items(); track item.id; let i = $index) {
          <div
            class="content-card"
            [class.selected]="selectionService.isSelected(item.id)()"
            (click)="selectItem.emit(item)"
            tabindex="0"
            role="button"
            (keydown.enter)="selectItem.emit(item)"
            (keydown.space)="selectItem.emit(item)"
          >
            <div class="card-thumbnail">
              <div class="card-checkbox" [class.any-selected]="selectionService.hasSelection()">
                <app-selection-checkbox
                  [itemId]="item.id"
                  [itemIndex]="i"
                  [orderedIds]="contentIds()"
                  (click)="$event.stopPropagation()"
                />
              </div>
              @if (item.transcodingStatus === 'completed' && thumbUrl()(item); as src) {
                <img [src]="src" alt="" class="thumb-img" loading="lazy" />
                @if (item.type === 'video') {
                  <span class="thumb-play-overlay" aria-hidden="true">
                    <span class="thumb-play-badge">&#9654;</span>
                  </span>
                }
              } @else if (item.type === 'video') {
                <div class="thumb-placeholder video">
                  <span class="thumb-icon">&#9654;</span>
                </div>
              } @else {
                <div class="thumb-placeholder">
                  <span class="thumb-icon">&#128247;</span>
                </div>
              }
              <!-- Transcoding overlay -->
              @if (item.transcodingStatus !== 'completed') {
                <div class="transcoding-overlay">
                  @if (item.transcodingStatus === 'pending') {
                    <span class="overlay-text">{{ t('content.grid.pending') }}</span>
                  } @else if (item.transcodingStatus === 'processing') {
                    <span class="overlay-text">{{
                      t('content.transcoding.percent', {
                        progress: transcodingProgress()[item.id] ?? 0,
                      })
                    }}</span>
                    <div class="overlay-bar">
                      <div
                        class="overlay-fill"
                        [style.width.%]="transcodingProgress()[item.id] ?? 0"
                      ></div>
                    </div>
                  } @else {
                    <span class="overlay-text failed">{{ t('content.grid.failed') }}</span>
                  }
                </div>
              }
            </div>
            <div class="card-info">
              <span class="card-title">{{ item.title }}</span>
              <span class="card-meta">{{
                t('content.grid.meta', {
                  type: t('content.type.' + item.type),
                  size: format.formatBytes(item.originalSizeBytes),
                })
              }}</span>
            </div>
          </div>
        }
      </div>

      <app-bulk-action-toolbar [actions]="bulkActions()" />
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 1rem;
    }
    .content-card {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      overflow: hidden;
      cursor: pointer;
      transition:
        border-color 0.15s,
        background-color 0.15s;
      box-shadow: var(--shadow);
    }
    .content-card:hover,
    .content-card:focus {
      border-color: var(--accent);
      background: var(--surface-3);
      outline: none;
    }
    .card-thumbnail {
      position: relative;
      aspect-ratio: 16/9;
      background: var(--surface-3);
      overflow: hidden;
    }
    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .thumb-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: var(--text-faint);
    }
    .thumb-placeholder.video {
      background: #1a1a2e;
    }

    /* Play badge centered over a video thumbnail (matches the playlist look). */
    .thumb-play-overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      pointer-events: none;
    }
    .thumb-play-badge {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      font-size: 0.9rem;
      padding-left: 0.15rem;
    }

    /* Transcoding overlay on grid cards */
    .transcoding-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.5rem;
    }
    .overlay-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: #fbbf24;
    }
    .overlay-text.failed {
      color: #ef4444;
    }
    .overlay-bar {
      width: 80%;
      height: 0.25rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      overflow: hidden;
    }
    .overlay-fill {
      height: 100%;
      background: #fbbf24;
      border-radius: 9999px;
      transition: width 0.2s;
    }

    .card-info {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .card-title {
      font-size: 0.8125rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: capitalize;
    }

    /* Grid Header with select-all */
    .grid-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    /* Selection checkbox overlay on cards */
    .card-checkbox {
      position: absolute;
      top: 0.375rem;
      left: 0.375rem;
      z-index: 2;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .content-card:hover .card-checkbox,
    .card-checkbox.any-selected {
      opacity: 1;
    }
    .content-card.selected {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }
  `,
})
export class ContentGrid {
  readonly items = input.required<Content[]>();
  readonly contentIds = input.required<string[]>();
  readonly transcodingProgress = input.required<Record<string, number | undefined>>();
  readonly bulkActions = input.required<BulkAction[]>();
  /** Returns the still-image thumbnail URL for a card, or null to show a placeholder. */
  readonly thumbUrl = input.required<(content: Content) => string | null>();
  readonly selectItem = output<Content>();

  protected readonly selectionService = inject(SelectionService);
  protected readonly format = inject(ContentFormatService);
}
