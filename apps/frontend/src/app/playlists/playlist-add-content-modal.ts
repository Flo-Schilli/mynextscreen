import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Content } from '../content/content.model';
import {
  OverlayComponent,
  ModalComponent,
  BtnComponent,
  SInputComponent,
  IconComponent,
} from '../ui';

/**
 * Presentational "add content to playlist" modal: a search field, a type
 * filter and a scrollable list of transcoded content (thumb + name + type +
 * add icon). Owns its own search/filter state; emits the picked content and a
 * dismiss intent. The parent loads `availableContent` and performs the add.
 */
@Component({
  selector: 'app-playlist-add-content-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent, SInputComponent, IconComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="Add content" icon="Plus" (closed)="dismiss.emit()">
        <div class="px-6 pt-4 pb-2">
          <mns-sinput [(value)]="query" placeholder="Search content…" icon="Search" />
          <div class="flex gap-1.5 mt-3">
            <mns-btn
              [variant]="!filter() ? 'soft' : 'ghost'"
              size="sm"
              (mnsClick)="filter.set(undefined)"
              >All</mns-btn
            >
            <mns-btn
              [variant]="filter() === 'image' ? 'soft' : 'ghost'"
              size="sm"
              (mnsClick)="filter.set('image')"
              >Images</mns-btn
            >
            <mns-btn
              [variant]="filter() === 'video' ? 'soft' : 'ghost'"
              size="sm"
              (mnsClick)="filter.set('video')"
              >Videos</mns-btn
            >
          </div>
        </div>

        <div class="px-6 pb-4 max-h-[50vh] overflow-y-auto">
          @if (loading()) {
            <p class="text-sm text-muted py-4">Loading content library…</p>
          } @else if (availableContent().length === 0) {
            <p class="text-sm text-muted py-4">No content available. Upload content first.</p>
          } @else if (filteredContent().length === 0) {
            <p class="text-sm text-muted py-4">No content matches your search.</p>
          } @else {
            <div class="flex flex-col gap-1.5">
              @for (content of filteredContent(); track content.id) {
                <button
                  type="button"
                  class="flex items-center gap-[11px] w-full px-2.5 py-2 rounded-[10px] text-left cursor-pointer hover:bg-hover"
                  (click)="selectContent.emit(content)"
                >
                  <span
                    class="relative w-11 h-7 rounded-[5px] flex-shrink-0 overflow-hidden bg-surface-3"
                  >
                    @if (content.type === 'image') {
                      <img [src]="thumbUrl()(content)" alt="" class="w-full h-full object-cover" />
                    } @else {
                      <span class="absolute inset-0 grid place-items-center text-white">
                        <mns-icon name="Play" [size]="10" />
                      </span>
                    }
                  </span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-[13px] font-semibold truncate">{{
                      content.title
                    }}</span>
                    <span class="block text-[11px] text-muted">{{ content.type }}</span>
                  </span>
                  <mns-icon name="Plus" [size]="15" class="text-accent flex-shrink-0" />
                </button>
              }
            </div>
          }
        </div>

        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Close</mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class PlaylistAddContentModal {
  readonly availableContent = input.required<Content[]>();
  readonly loading = input.required<boolean>();
  readonly thumbUrl = input.required<(content: Content) => string>();
  readonly selectContent = output<Content>();
  readonly dismiss = output<void>();

  protected readonly filter = signal<'image' | 'video' | undefined>(undefined);
  protected readonly query = signal('');

  protected readonly filteredContent = computed(() => {
    let content = this.availableContent().filter((c) => c.transcodingStatus === 'completed');
    const f = this.filter();
    if (f) {
      content = content.filter((c) => c.type === f);
    }
    const q = this.query().trim().toLowerCase();
    if (q) {
      content = content.filter((c) => c.title.toLowerCase().includes(q));
    }
    return content;
  });
}
