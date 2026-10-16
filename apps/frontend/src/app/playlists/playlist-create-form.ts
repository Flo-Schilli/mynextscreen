import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PLAYLIST_COLORS, PlaylistKind } from './playlist.model';
import { availableFormats } from './playlist-rule-form';
import { ContentSource, SlideFormat } from '../sources/content-source.model';
import { formatLabel } from '../sources/source-form-state';
import {
  OverlayComponent,
  ModalComponent,
  BtnComponent,
  IconComponent,
  MultiSelectComponent,
  SelectComponent,
  SelectOption,
  SInputComponent,
  SFieldComponent,
} from '../ui';

const KINDS: readonly PlaylistKind[] = ['static', 'dynamic'];

/**
 * Presentational create-playlist modal. Owns the name, accent colour and kind
 * via {@link model}; a dynamic playlist also needs its sources and slide
 * format up front, everything else of its rule is set in the editor. The
 * parent performs the create request and feeds back `creating`/`error`.
 */
@Component({
  selector: 'app-playlist-create-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OverlayComponent,
    ModalComponent,
    BtnComponent,
    IconComponent,
    MultiSelectComponent,
    RouterLink,
    SelectComponent,
    SInputComponent,
    SFieldComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal [title]="t('playlists.create.title')" icon="Playlists" (closed)="dismiss.emit()">
        <div class="px-6 pt-4 pb-2 flex flex-col gap-5">
          <mns-sfield [label]="t('playlists.create.nameLabel')">
            <mns-sinput [(value)]="name" [placeholder]="t('playlists.create.namePlaceholder')" />
          </mns-sfield>
          <div>
            <div class="text-[12.5px] font-semibold text-muted mb-[9px]">
              {{ t('playlists.create.kindLabel') }}
            </div>
            <div class="grid grid-cols-2 gap-2" role="radiogroup">
              @for (k of kinds; track k) {
                <button
                  type="button"
                  role="radio"
                  class="kind-option flex flex-col items-start gap-1 rounded-[12px] border px-3 py-2.5 text-left cursor-pointer"
                  [class.border-accent]="kind() === k"
                  [class.bg-accent-soft]="kind() === k"
                  [class.border-border-strong]="kind() !== k"
                  [attr.aria-checked]="kind() === k"
                  [attr.data-kind]="k"
                  (click)="kind.set(k)"
                >
                  <span class="inline-flex items-center gap-1.5 text-sm font-bold">
                    <mns-icon [name]="k === 'dynamic' ? 'Sparkle' : 'List'" [size]="15" />
                    {{
                      t(
                        k === 'dynamic'
                          ? 'playlists.create.kindDynamic'
                          : 'playlists.create.kindStatic'
                      )
                    }}
                  </span>
                  <span class="text-[12px] text-muted">{{
                    t(
                      k === 'dynamic'
                        ? 'playlists.create.kindDynamicDesc'
                        : 'playlists.create.kindStaticDesc'
                    )
                  }}</span>
                </button>
              }
            </div>
          </div>
          @if (kind() === 'dynamic') {
            @if (sourcesLoading()) {
              <p class="text-sm text-muted">{{ t('common.status.loading') }}</p>
            } @else if (sources().length === 0) {
              <div class="no-sources flex flex-wrap items-center justify-between gap-2 text-sm">
                <span class="text-muted">{{ t('playlists.create.noSources') }}</span>
                <a
                  routerLink="/sources"
                  class="font-semibold text-accent"
                  (click)="dismiss.emit()"
                  >{{ t('playlists.create.goToSources') }}</a
                >
              </div>
            } @else {
              <mns-sfield [label]="t('playlists.create.sourcesLabel')">
                <mns-multi-select
                  [options]="sourceOptions()"
                  [values]="sourceIds()"
                  [placeholder]="t('playlists.create.sourcesPlaceholder')"
                  [ariaLabel]="t('playlists.create.sourcesLabel')"
                  (changed)="onSourcesChange($event)"
                />
              </mns-sfield>
              @if (formatOptions().length > 0) {
                <mns-sfield
                  [label]="t('playlists.create.formatLabel')"
                  [hint]="t('playlists.create.ruleHint')"
                >
                  <mns-select
                    [options]="formatOptions()"
                    [value]="format()"
                    [searchable]="false"
                    [ariaLabel]="t('playlists.create.formatLabel')"
                    (changed)="onFormatChange($event)"
                  />
                </mns-sfield>
              }
            }
          }
          <div>
            <div class="text-[12.5px] font-semibold text-muted mb-[9px]">
              {{ t('playlists.create.accentColor') }}
            </div>
            <div class="flex gap-[9px]">
              @for (c of colors; track c) {
                <button
                  type="button"
                  class="w-7 h-7 rounded-[8px] cursor-pointer"
                  [style.background]="c"
                  [style.border]="color() === c ? '2px solid #fff' : '2px solid transparent'"
                  [style.box-shadow]="color() === c ? '0 0 0 2px ' + c : 'none'"
                  [attr.aria-label]="t('playlists.create.setAccentColor', { color: c })"
                  (click)="color.set(c)"
                ></button>
              }
            </div>
          </div>
          @if (error()) {
            <p class="text-offline text-sm">{{ error() }}</p>
          }
        </div>
        <div slot="footer" class="flex gap-2.5 px-6 pb-5">
          <mns-btn variant="outline" [full]="true" (mnsClick)="dismiss.emit()">{{
            t('common.actions.cancel')
          }}</mns-btn>
          <mns-btn
            variant="primary"
            [full]="true"
            icon="Plus"
            [disabled]="creating()"
            (mnsClick)="create.emit()"
          >
            {{ creating() ? t('playlists.create.creating') : t('playlists.create.createPlaylist') }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class PlaylistCreateForm {
  readonly name = model.required<string>();
  readonly color = model.required<string>();
  readonly error = input.required<string>();
  readonly creating = input.required<boolean>();
  readonly kind = model<PlaylistKind>('static');
  /** Sources a dynamic playlist can draw from. */
  readonly sources = input<ContentSource[]>([]);
  readonly sourcesLoading = input(false);
  readonly sourceIds = model<string[]>([]);
  readonly format = model<SlideFormat | ''>('');
  readonly create = output<void>();
  readonly dismiss = output<void>();

  protected readonly colors = PLAYLIST_COLORS;
  protected readonly kinds = KINDS;

  protected readonly sourceOptions = computed<SelectOption[]>(() =>
    this.sources().map((s) => ({ value: s.id, label: s.name })),
  );
  private readonly formats = computed(() => availableFormats(this.sources(), this.sourceIds()));
  protected readonly formatOptions = computed<SelectOption[]>(() =>
    this.formats().map((f) => ({ value: f, label: formatLabel(f) })),
  );

  /** Keeps the format one of those the picked sources render. */
  protected onSourcesChange(ids: string[]): void {
    this.sourceIds.set(ids);
    const formats = availableFormats(this.sources(), ids);
    const current = this.format();
    if (!current || !formats.includes(current)) this.format.set(formats[0] ?? '');
  }

  protected onFormatChange(value: string): void {
    const format = this.formats().find((f) => f === value);
    if (format) this.format.set(format);
  }
}
