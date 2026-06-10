import { Component, inject, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridCell } from './screen-group-grid-editor';
import { Content } from '../content/content.model';
import { ScreenWallPreviewService } from './screen-wall-preview.service';

/**
 * Split video-wall preview: a content picker plus a grid where one source image
 * is sliced across the cells. The parent resolves the chosen content into a
 * preview image URL (and aspect ratio) and feeds them back in; cell geometry
 * comes from {@link ScreenWallPreviewService}.
 */
@Component({
  selector: 'app-screen-group-wall-preview',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="wall-preview-section">
      <h2 class="section-title">Preview Wall</h2>
      <div class="preview-content-picker">
        <label for="previewContentSelect">Select content to preview:</label>
        @if (loadingContent()) {
          <span class="loading-text">Loading content...</span>
        } @else {
          <select
            id="previewContentSelect"
            [(ngModel)]="selectedContentId"
            (ngModelChange)="selectContent.emit($event)"
          >
            <option value="">-- Select content --</option>
            @for (item of contentItems(); track item.id) {
              <option [value]="item.id">{{ item.title }} ({{ item.type }})</option>
            }
          </select>
        }
      </div>
      @if (previewImageUrl()) {
        <div
          class="preview-grid"
          [style.grid-template-columns]="'repeat(' + gridColumns() + ', 1fr)'"
          [style.grid-template-rows]="'repeat(' + gridRows() + ', 1fr)'"
          [style.aspect-ratio]="previewAspectRatio()"
        >
          @for (cell of gridCells(); track cell.dropListId) {
            <div
              class="preview-cell"
              [class.unassigned]="!cell.screen"
              [style.background-image]="cell.screen ? 'url(' + previewImageUrl() + ')' : 'none'"
              [style.background-size]="bgSize()"
              [style.background-position]="bgPosition(cell.col, cell.row)"
            >
              <span class="preview-label">{{ cell.screen?.name ?? 'Empty' }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 1rem;
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
  `,
})
export class ScreenGroupWallPreview {
  readonly gridCells = input.required<GridCell[]>();
  readonly gridColumns = input.required<number | null>();
  readonly gridRows = input.required<number | null>();
  readonly contentItems = input.required<Content[]>();
  readonly loadingContent = input.required<boolean>();
  readonly previewImageUrl = input.required<string | null>();
  readonly previewAspectRatio = input.required<string>();
  readonly selectedContentId = model<string>('');

  readonly selectContent = output<string>();

  private readonly preview = inject(ScreenWallPreviewService);

  bgSize(): string {
    return this.preview.backgroundSize(this.gridColumns(), this.gridRows());
  }

  bgPosition(col: number, row: number): string {
    return this.preview.backgroundPosition(col, row, this.gridColumns(), this.gridRows());
  }
}
