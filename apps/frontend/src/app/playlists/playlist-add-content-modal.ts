import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Content } from '../content/content.model';
import { naturalCompare } from '../shared/natural-sort';
import {
  OverlayComponent,
  ModalComponent,
  BtnComponent,
  SInputComponent,
  IconComponent,
} from '../ui';

/**
 * Presentational "add content to playlist" modal: a search field, a type
 * filter and a naturally sorted list of transcoded content. Clicking rows
 * builds an ordered multi-selection (numbered badges); the add button emits it
 * in click order, so the parent appends the items exactly in that order. The
 * selection survives search and filter changes. The parent loads
 * `availableContent` and performs the add.
 */
@Component({
  selector: 'app-playlist-add-content-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OverlayComponent,
    ModalComponent,
    BtnComponent,
    SInputComponent,
    IconComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal [title]="t('playlists.addContent.title')" icon="Plus" (closed)="dismiss.emit()">
        <div class="px-6 pt-4 pb-2">
          <p class="text-[12.5px] text-muted mb-3">{{ t('playlists.addContent.selectHint') }}</p>
          <mns-sinput
            [(value)]="query"
            [placeholder]="t('playlists.addContent.searchPlaceholder')"
            icon="Search"
          />
          <div class="flex gap-1.5 mt-3">
            <mns-btn
              [variant]="!filter() ? 'soft' : 'ghost'"
              size="sm"
              (mnsClick)="filter.set(undefined)"
              >{{ t('playlists.addContent.all') }}</mns-btn
            >
            <mns-btn
              [variant]="filter() === 'image' ? 'soft' : 'ghost'"
              size="sm"
              (mnsClick)="filter.set('image')"
              >{{ t('playlists.addContent.images') }}</mns-btn
            >
            <mns-btn
              [variant]="filter() === 'video' ? 'soft' : 'ghost'"
              size="sm"
              (mnsClick)="filter.set('video')"
              >{{ t('playlists.addContent.videos') }}</mns-btn
            >
          </div>
        </div>

        <div class="px-6 pb-4 max-h-[50vh] overflow-y-auto">
          @if (loading()) {
            <p class="text-sm text-muted py-4">{{ t('playlists.addContent.loading') }}</p>
          } @else if (availableContent().length === 0) {
            <p class="text-sm text-muted py-4">{{ t('playlists.addContent.empty') }}</p>
          } @else if (filteredContent().length === 0) {
            <p class="text-sm text-muted py-4">{{ t('playlists.addContent.noMatches') }}</p>
          } @else {
            <div class="flex flex-col gap-1.5">
              @for (content of filteredContent(); track content.id) {
                @let position = positionOf()(content.id);
                <button
                  type="button"
                  class="flex items-center gap-[11px] w-full px-2.5 py-2 rounded-[10px] text-left cursor-pointer hover:bg-hover"
                  [class.bg-accent-soft]="position > 0"
                  [attr.aria-pressed]="position > 0"
                  [attr.data-content-id]="content.id"
                  (click)="toggle(content.id)"
                >
                  <span
                    class="relative w-11 h-7 rounded-[5px] flex-shrink-0 overflow-hidden bg-surface-3"
                  >
                    @if (thumbUrl()(content); as src) {
                      <img [src]="src" alt="" class="w-full h-full object-cover" loading="lazy" />
                    } @else {
                      <span class="absolute inset-0 grid place-items-center text-white">
                        <mns-icon
                          [name]="content.type === 'video' ? 'Play' : 'Image'"
                          [size]="10"
                        />
                      </span>
                    }
                  </span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-[13px] font-semibold truncate">{{
                      content.title
                    }}</span>
                    <span class="block text-[11px] text-muted">{{
                      t('content.type.' + content.type)
                    }}</span>
                  </span>
                  @if (position > 0) {
                    <span
                      class="selection-badge grid place-items-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-white text-[11.5px] font-bold font-mono flex-shrink-0"
                      [attr.aria-label]="t('playlists.addContent.selectedPosition', { position })"
                      >{{ position }}</span
                    >
                  } @else {
                    <mns-icon name="Plus" [size]="15" class="text-accent flex-shrink-0" />
                  }
                </button>
              }
            </div>
          }
        </div>

        <div slot="footer" class="flex flex-wrap justify-end gap-2 px-6 pb-5">
          @if (selectedIds().length > 0) {
            <mns-btn variant="ghost" (mnsClick)="selectedIds.set([])">{{
              t('playlists.addContent.clearSelection')
            }}</mns-btn>
          }
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">{{
            t('common.actions.close')
          }}</mns-btn>
          <mns-btn
            variant="primary"
            icon="Plus"
            [disabled]="selectedIds().length === 0"
            (mnsClick)="emitSelection()"
            >{{ t('playlists.addContent.addSelected', { count: selectedIds().length }) }}</mns-btn
          >
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class PlaylistAddContentModal {
  readonly availableContent = input.required<Content[]>();
  readonly loading = input.required<boolean>();
  readonly thumbUrl = input.required<(content: Content) => string | null>();
  /** The picked content, in the order it was clicked. */
  readonly addSelected = output<Content[]>();
  readonly dismiss = output<void>();

  protected readonly filter = signal<'image' | 'video' | undefined>(undefined);
  protected readonly query = signal('');
  /** Content ids in click order; position in this array = playlist order. */
  protected readonly selectedIds = signal<string[]>([]);

  /** 1-based selection number of a content id, 0 when not selected. */
  protected readonly positionOf = computed(() => {
    const positions = new Map(this.selectedIds().map((id, index) => [id, index + 1]));
    return (id: string): number => positions.get(id) ?? 0;
  });

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
    return [...content].sort((a, b) => naturalCompare(a.title, b.title));
  });

  /** Appends an unselected id; removing one renumbers everything after it. */
  protected toggle(id: string): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((selected) => selected !== id) : [...ids, id],
    );
  }

  protected emitSelection(): void {
    const byId = new Map(this.availableContent().map((content) => [content.id, content]));
    const picked = this.selectedIds()
      .map((id) => byId.get(id))
      .filter((content): content is Content => content !== undefined);
    if (picked.length > 0) {
      this.addSelected.emit(picked);
    }
  }
}
