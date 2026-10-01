import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import {
  Playlist,
  PlaylistItem,
  TransitionType,
  TRANSITION_OPTIONS,
  PLAYLIST_COLORS,
} from './playlist.model';
import { PlaylistFormatService } from './playlist-format.service';
import { PlaylistLoopPreview } from './playlist-loop-preview';
import {
  CardComponent,
  CardHeadComponent,
  BadgeComponent,
  BtnComponent,
  IconComponent,
  SelectComponent,
  SelectOption,
} from '../ui';
import { BackLink } from '../shared/back-link';

/** A per-item field change emitted by the editor for the parent to persist. */
export interface ItemFieldChange<T> {
  item: PlaylistItem;
  value: T;
}

/**
 * Presentational playlist editor: back button, a header card (gradient accent
 * tile, inline rename, badges, accent-colour picker, set-default, delete), a
 * live loop preview, the CDK drag-and-drop sequence with per-item
 * duration/transition controls, and an inline media preview. Owns only local
 * rename state; every data mutation is emitted for the parent to persist.
 */
@Component({
  selector: 'app-playlist-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BackLink,
    DragDropModule,
    PlaylistLoopPreview,
    CardComponent,
    CardHeadComponent,
    BadgeComponent,
    BtnComponent,
    IconComponent,
    SelectComponent,
  ],
  template: `
    <!-- back -->
    <div class="mb-4"><app-back-link (back)="dismiss.emit()" /></div>

    <!-- header -->
    <mns-card>
      <div class="flex flex-wrap items-center gap-4">
        <span
          class="grid place-items-center w-[52px] h-[52px] rounded-[14px] text-white flex-shrink-0"
          [style.background]="tileGradient()"
        >
          <mns-icon name="Playlists" [size]="25" />
        </span>
        <div class="flex-1 min-w-0">
          <input
            class="w-full text-[20px] font-extrabold tracking-[-0.01em] text-text bg-transparent border border-transparent rounded-lg px-1.5 py-0.5 -mx-1.5 -my-0.5 outline-none focus:bg-surface-2 focus:border-border-strong"
            type="text"
            [value]="playlist().name"
            #nameInput
            (blur)="commitName(nameInput.value)"
            (keydown.enter)="nameInput.blur()"
            (keydown.escape)="resetName(nameInput)"
          />
          <div class="flex items-center gap-[9px] mt-[7px] flex-wrap">
            <mns-badge tone="accent" icon="Playlists">{{ itemCountLabel() }}</mns-badge>
            <mns-badge tone="neutral" icon="Clock">{{ durationLabel() }}</mns-badge>
            @if (isDefault()) {
              <mns-badge tone="info" icon="Check">Default</mns-badge>
            }
            @if (reslicing()) {
              <mns-badge tone="warning" icon="Layers">Re-rendering video wall…</mns-badge>
            }
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          @if (isOrgAdmin()) {
            <mns-btn
              [variant]="isDefault() ? 'outline' : 'soft'"
              size="sm"
              [disabled]="settingDefault()"
              (mnsClick)="toggleDefault.emit()"
            >
              {{ isDefault() ? 'Default playlist' : 'Set as default' }}
            </mns-btn>
          }
          <mns-btn variant="soft" size="sm" icon="Copy" (mnsClick)="copyLink.emit()"
            >Copy link</mns-btn
          >
          <mns-btn variant="danger" size="sm" icon="Trash" (mnsClick)="deletePlaylist.emit()"
            >Delete</mns-btn
          >
        </div>
      </div>

      <!-- accent colour -->
      <div class="mt-4 pt-4 border-t border-border">
        <div class="text-[12.5px] font-semibold text-muted mb-[9px]">Accent colour</div>
        <div class="flex gap-[9px]">
          @for (c of colors; track c) {
            <button
              type="button"
              class="w-[26px] h-[26px] rounded-[8px] cursor-pointer"
              [style.background]="c"
              [style.border]="playlist().color === c ? '2px solid #fff' : '2px solid transparent'"
              [style.box-shadow]="playlist().color === c ? '0 0 0 2px ' + c : 'none'"
              [attr.aria-label]="'Set accent colour ' + c"
              (click)="colorChange.emit(c)"
            ></button>
          }
        </div>
      </div>
    </mns-card>

    @if (editorError()) {
      <p class="text-offline text-sm mt-3">{{ editorError() }}</p>
    }

    <!-- live loop preview -->
    <div class="mt-[var(--gap)]">
      <app-playlist-loop-preview [items]="playlist().items" [mediaUrl]="previewUrl()" />
    </div>

    <!-- sequence -->
    <div class="mt-[var(--gap)]">
      <mns-card>
        <mns-card-head
          title="Sequence"
          sub="Drag to reorder · set duration & transition per item"
          icon="List"
        >
          <mns-btn slot="right" variant="soft" size="md" icon="Plus" (mnsClick)="addContent.emit()"
            >Add content</mns-btn
          >
        </mns-card-head>

        @if (playlist().items.length === 0) {
          <div
            class="grid place-items-center py-9 px-5 rounded-[12px] border-[1.5px] border-dashed border-border-strong bg-surface-2 text-faint gap-2"
          >
            <mns-icon name="Plus" [size]="22" />
            <span class="text-[13px] font-semibold"
              >No items yet — add content to build the loop</span
            >
          </div>
        } @else {
          <div cdkDropList class="flex flex-col gap-2" (cdkDropListDropped)="reorder.emit($event)">
            @for (item of playlist().items; track item.id; let i = $index) {
              <div
                class="item-row flex flex-wrap sm:flex-nowrap items-center gap-3 px-3 py-2.5 rounded-[12px] bg-surface-2 border border-border"
                cdkDrag
              >
                <span
                  class="grid place-items-center w-[22px] h-[30px] text-faint cursor-grab flex-shrink-0"
                  cdkDragHandle
                  title="Drag to reorder"
                >
                  <svg width="13" height="18" viewBox="0 0 13 18" fill="currentColor">
                    <circle cx="3.5" cy="3" r="1.4" />
                    <circle cx="9.5" cy="3" r="1.4" />
                    <circle cx="3.5" cy="9" r="1.4" />
                    <circle cx="9.5" cy="9" r="1.4" />
                    <circle cx="3.5" cy="15" r="1.4" />
                    <circle cx="9.5" cy="15" r="1.4" />
                  </svg>
                </span>
                <span
                  class="font-mono w-5 text-center text-[12px] font-bold text-faint flex-shrink-0"
                  >{{ i + 1 }}</span
                >
                <button
                  type="button"
                  class="relative w-14 h-[34px] rounded-[6px] flex-shrink-0 overflow-hidden bg-surface-3 cursor-pointer"
                  (click)="previewItem.emit(item)"
                  aria-label="Preview item"
                >
                  @if (thumbUrl()(item); as src) {
                    <img [src]="src" alt="" class="w-full h-full object-cover" loading="lazy" />
                    @if (item.content?.type === 'video') {
                      <span class="absolute inset-0 grid place-items-center pointer-events-none">
                        <span
                          class="grid place-items-center w-5 h-5 rounded-full bg-black/45 text-white"
                        >
                          <mns-icon name="Play" [size]="10" />
                        </span>
                      </span>
                    }
                  } @else if (item.content?.type === 'video') {
                    <span class="absolute inset-0 grid place-items-center text-white bg-black/45">
                      <mns-icon name="Play" [size]="11" />
                    </span>
                  } @else {
                    <span class="absolute inset-0 grid place-items-center text-white">
                      <mns-icon name="Image" [size]="11" />
                    </span>
                  }
                </button>
                <div class="flex-1 min-w-0">
                  <div class="text-[13.5px] font-semibold truncate">
                    {{ item.content?.title || 'Untitled' }}
                  </div>
                  <div class="flex items-center gap-[7px] mt-0.5">
                    <span class="inline-flex items-center gap-1 text-[11.5px] text-muted">
                      <mns-icon
                        [name]="item.content?.type === 'video' ? 'Video' : 'Image'"
                        [size]="12"
                      />
                      {{ item.content?.type || 'unknown' }}
                    </span>
                  </div>
                </div>

                <!-- duration -->
                @if (item.content?.type === 'video') {
                  <span
                    class="inline-flex w-full sm:w-auto justify-center sm:justify-start items-center gap-1.5 px-[11px] py-1.5 rounded-[9px] bg-surface border border-border text-muted text-[12.5px] font-semibold"
                    title="Plays the full video length"
                  >
                    <mns-icon name="Clock" [size]="13" />
                    <span class="font-mono">{{ durationDisplay(item) }}</span>
                  </span>
                } @else {
                  <div
                    class="flex w-full sm:w-auto justify-center sm:justify-start items-center border border-border-strong rounded-[9px] overflow-hidden bg-surface"
                  >
                    <button
                      type="button"
                      class="grid place-items-center w-[26px] h-[26px] text-muted text-[16px] font-bold leading-none cursor-pointer"
                      aria-label="Decrease duration"
                      (click)="stepDuration(item, -1)"
                    >
                      −
                    </button>
                    <span class="font-mono min-w-[42px] text-center font-bold text-[12.5px]"
                      >{{ item.durationSeconds }}s</span
                    >
                    <button
                      type="button"
                      class="grid place-items-center w-[26px] h-[26px] text-muted text-[16px] font-bold leading-none cursor-pointer"
                      aria-label="Increase duration"
                      (click)="stepDuration(item, 1)"
                    >
                      +
                    </button>
                  </div>
                }

                <!-- transition -->
                <div class="w-full sm:w-[140px] sm:flex-shrink-0">
                  <mns-select
                    [options]="transitionOptions"
                    [value]="item.transition"
                    (changed)="transitionChange.emit({ item, value: asTransition($event) })"
                  />
                </div>

                <!-- transition duration (ms) -->
                <div
                  class="flex w-full sm:w-auto justify-center sm:justify-start items-center border border-border-strong rounded-[9px] overflow-hidden bg-surface sm:flex-shrink-0"
                  title="Transition duration (ms)"
                >
                  <button
                    type="button"
                    class="grid place-items-center w-[26px] h-[26px] text-muted text-[16px] font-bold leading-none cursor-pointer"
                    aria-label="Decrease transition ms"
                    (click)="stepTransitionMs(item, -100)"
                  >
                    −
                  </button>
                  <span class="font-mono min-w-[52px] text-center font-bold text-[12.5px]"
                    >{{ item.transitionDurationMs }}ms</span
                  >
                  <button
                    type="button"
                    class="grid place-items-center w-[26px] h-[26px] text-muted text-[16px] font-bold leading-none cursor-pointer"
                    aria-label="Increase transition ms"
                    (click)="stepTransitionMs(item, 100)"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  class="grid place-items-center w-[30px] h-[30px] rounded-[8px] flex-shrink-0 border border-border bg-transparent text-faint cursor-pointer hover:text-offline hover:border-offline"
                  title="Remove from playlist"
                  (click)="removeItem.emit(item)"
                >
                  <mns-icon name="Trash" [size]="14" />
                </button>
              </div>
            }
          </div>
        }
      </mns-card>
    </div>

    <!-- inline preview -->
    @if (previewingItem()) {
      <div class="mt-[var(--gap)]">
        <mns-card>
          <mns-card-head
            [title]="'Preview: ' + (previewingItem()!.content?.title || 'Untitled')"
            icon="Eye"
          >
            <mns-btn slot="right" variant="outline" size="sm" (mnsClick)="closePreview.emit()"
              >Close</mns-btn
            >
          </mns-card-head>
          <div class="text-center">
            @if (previewingItem()!.content?.type === 'image') {
              <img
                [src]="previewUrl()(previewingItem()!)"
                alt="Preview"
                class="max-w-full max-h-96 rounded-[8px] border border-border inline-block"
              />
            } @else {
              <video
                [src]="previewUrl()(previewingItem()!)"
                controls
                class="max-w-full max-h-96 rounded-[8px] border border-border inline-block"
              ></video>
            }
          </div>
        </mns-card>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .item-row.cdk-drag-preview {
      box-shadow: var(--shadow-lg);
    }
    .cdk-drag-placeholder {
      opacity: 0.4;
    }
    .cdk-drag-animating {
      transition: transform 200ms ease;
    }
    .cdk-drop-list-dragging .item-row:not(.cdk-drag-placeholder) {
      transition: transform 200ms ease;
    }
  `,
})
export class PlaylistEditor {
  readonly playlist = input.required<Playlist>();
  readonly isOrgAdmin = input.required<boolean>();
  readonly isDefault = input.required<boolean>();
  readonly settingDefault = input.required<boolean>();
  readonly editorError = input.required<string>();
  readonly previewingItem = input.required<PlaylistItem | null>();
  /** True while a split group's wall is (re)slicing this playlist's content. */
  readonly reslicing = input<boolean>(false);
  readonly thumbUrl = input.required<(item: PlaylistItem) => string | null>();
  readonly previewUrl = input.required<(item: PlaylistItem) => string>();

  readonly rename = output<string>();
  readonly colorChange = output<string>();
  readonly toggleDefault = output<void>();
  readonly deletePlaylist = output<void>();
  readonly copyLink = output<void>();
  readonly dismiss = output<void>();
  readonly addContent = output<void>();
  readonly removeItem = output<PlaylistItem>();
  readonly reorder = output<CdkDragDrop<PlaylistItem[]>>();
  readonly durationChange = output<ItemFieldChange<number>>();
  readonly transitionChange = output<ItemFieldChange<TransitionType>>();
  readonly transitionDurationChange = output<ItemFieldChange<number>>();
  readonly previewItem = output<PlaylistItem>();
  readonly closePreview = output<void>();

  protected readonly format = inject(PlaylistFormatService);
  protected readonly transitionOptions: SelectOption[] = TRANSITION_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));
  protected readonly colors = PLAYLIST_COLORS;

  protected readonly tileGradient = computed(() => {
    const color = this.playlist().color;
    return `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #fff))`;
  });

  protected readonly itemCountLabel = computed(() => {
    const n = this.playlist().items.length;
    return `${n} item${n !== 1 ? 's' : ''}`;
  });

  protected readonly durationLabel = computed(() =>
    this.format.formatDuration(this.format.totalDurationSeconds(this.playlist().items)),
  );

  protected commitName(value: string): void {
    const name = value.trim();
    if (name && name !== this.playlist().name) {
      this.rename.emit(name);
    }
  }

  protected resetName(input: HTMLInputElement): void {
    input.value = this.playlist().name;
    input.blur();
  }

  protected asTransition(value: string): TransitionType {
    return value as TransitionType;
  }

  protected durationDisplay(item: PlaylistItem): string {
    const secs = item.content?.durationSeconds ?? item.durationSeconds;
    return this.format.formatDuration(secs);
  }

  protected stepDuration(item: PlaylistItem, delta: number): void {
    const next = Math.max(1, item.durationSeconds + delta);
    this.durationChange.emit({ item, value: next });
  }

  protected stepTransitionMs(item: PlaylistItem, delta: number): void {
    const next = Math.min(3000, Math.max(0, item.transitionDurationMs + delta));
    this.transitionDurationChange.emit({ item, value: next });
  }
}
