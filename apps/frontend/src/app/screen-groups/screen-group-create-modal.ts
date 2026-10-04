import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  OverlayComponent,
  ModalComponent,
  BtnComponent,
  IconComponent,
  StatusDotComponent,
} from '../ui';
import { CreateScreenGroupSubmit, ScreenGroupMode } from './screen-group.model';
import { ScreenGroupModeToggle } from './screen-group-mode-toggle';
import { StepperComponent } from '../ui';
import { Screen } from '../screens/screen.model';

const COLORS = ['#6d6cf6', '#0ea5e9', '#ec4899', '#14b8a6', '#10b981', '#f59e0b', '#8b5cf6'];

/**
 * Create-screen-group modal (mns-overlay/mns-modal). Owns its own field state
 * (name, colour, mode, grid dimensions, selected screens) and emits a resolved
 * {@link CreateScreenGroupSubmit} only when valid. The parent runs the HTTP work
 * and feeds `creating`/`error` back in.
 */
@Component({
  selector: 'app-screen-group-create-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OverlayComponent,
    ModalComponent,
    BtnComponent,
    IconComponent,
    StatusDotComponent,
    ScreenGroupModeToggle,
    StepperComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal
        [title]="t('screenGroups.create.title')"
        icon="Groups"
        [widthPx]="560"
        (closed)="dismiss.emit()"
      >
        <div class="flex flex-col gap-5">
          <label class="block">
            <span class="block text-[12.5px] font-semibold text-muted mb-2">{{
              t('screenGroups.create.nameLabel')
            }}</span>
            <input
              class="w-full px-3 py-2.5 rounded-[10px] text-sm bg-surface-2 border border-border-strong text-text outline-none"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
              [placeholder]="t('screenGroups.create.namePlaceholder')"
            />
          </label>

          <div>
            <span class="block text-[12.5px] font-semibold text-muted mb-2.5">{{
              t('screenGroups.create.colourLabel')
            }}</span>
            <div class="flex gap-2.5">
              @for (c of colors; track c) {
                <button
                  type="button"
                  class="w-7 h-7 rounded-lg cursor-pointer"
                  [style.background]="c"
                  [style.border]="color() === c ? '2px solid #fff' : '2px solid transparent'"
                  [style.box-shadow]="color() === c ? '0 0 0 2px ' + c : 'none'"
                  [attr.aria-label]="t('screenGroups.create.colourAria', { colour: c })"
                  (click)="color.set(c)"
                ></button>
              }
            </div>
          </div>

          <div>
            <span class="block text-[12.5px] font-semibold text-muted mb-2.5">{{
              t('screenGroups.create.displayModeLabel')
            }}</span>
            <app-screen-group-mode-toggle [value]="mode()" (modeChange)="mode.set($event)" />
          </div>

          @if (mode() === 'split') {
            <div class="p-4 rounded-[13px] bg-surface-2 border border-border flex flex-col gap-3.5">
              <mns-stepper
                [label]="t('screenGroups.create.columns')"
                [(value)]="cols"
                [min]="1"
                [max]="4"
              />
              <mns-stepper
                [label]="t('screenGroups.create.rows')"
                [(value)]="rows"
                [min]="1"
                [max]="4"
              />
              <div class="text-xs text-faint">
                {{
                  t('screenGroups.create.wallHint', {
                    cols: cols(),
                    rows: rows(),
                    panels: cols() * rows(),
                  })
                }}
              </div>
            </div>
          }

          <div>
            <span class="block text-[12.5px] font-semibold text-muted mb-2.5">
              {{ t('screenGroups.create.addScreens') }}
              @if (selected().length > 0) {
                <span class="text-accent">{{
                  t('screenGroups.create.selectedSuffix', { count: selected().length })
                }}</span>
              }
            </span>
            <div class="flex flex-col gap-[7px] max-h-[188px] overflow-y-auto">
              @for (s of availableScreens(); track s.id) {
                <button
                  type="button"
                  class="flex items-center gap-2.5 px-2.5 py-2 rounded-[11px] text-left border"
                  [class.border-accent]="isSelected(s.id)"
                  [class.bg-accent-soft]="isSelected(s.id)"
                  [class.border-border]="!isSelected(s.id)"
                  [class.bg-surface-2]="!isSelected(s.id)"
                  (click)="toggle(s.id)"
                >
                  <span
                    class="grid place-items-center w-[18px] h-[18px] rounded-md flex-shrink-0 text-white border"
                    [class.border-accent]="isSelected(s.id)"
                    [class.bg-accent]="isSelected(s.id)"
                    [class.border-border-strong]="!isSelected(s.id)"
                  >
                    @if (isSelected(s.id)) {
                      <mns-icon name="Check" [size]="12" [strokeWidth]="3" />
                    }
                  </span>
                  <span class="w-[30px] h-[19px] rounded flex-shrink-0 bg-surface-3"></span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-[13.5px] font-semibold truncate">{{ s.name }}</span>
                    <span class="block text-[11.5px] text-muted">{{ s.location }}</span>
                  </span>
                  <mns-status-dot [status]="s.isOnline ? 'online' : 'offline'" [size]="7" />
                </button>
              }
              @if (availableScreens().length === 0) {
                <div class="text-[13px] text-muted py-1.5">
                  {{ t('screenGroups.create.noUnassigned') }}
                </div>
              }
            </div>
          </div>

          @if (localError() || error()) {
            <p class="text-offline text-sm">{{ localError() || error() }}</p>
          }
        </div>

        <div slot="footer" class="flex gap-2.5 px-6 py-5 border-t border-border">
          <mns-btn variant="outline" [full]="true" (mnsClick)="dismiss.emit()">{{
            t('common.actions.cancel')
          }}</mns-btn>
          <mns-btn
            [variant]="valid() ? 'primary' : 'ghost'"
            [full]="true"
            icon="Plus"
            [disabled]="!valid() || creating()"
            (mnsClick)="onSubmit()"
            >{{
              creating() ? t('screenGroups.create.creating') : t('screenGroups.create.createGroup')
            }}</mns-btn
          >
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class ScreenGroupCreateModal {
  readonly availableScreens = input.required<Screen[]>();
  readonly creating = input.required<boolean>();
  readonly error = input.required<string>();

  readonly create = output<CreateScreenGroupSubmit>();
  readonly dismiss = output<void>();

  private readonly transloco = inject(TranslocoService);

  protected readonly colors = COLORS;

  protected readonly name = signal('');
  protected readonly color = signal(COLORS[0]);
  protected readonly mode = signal<ScreenGroupMode>('mirror');
  protected readonly cols = signal(2);
  protected readonly rows = signal(1);
  protected readonly selected = signal<string[]>([]);
  protected readonly localError = signal('');

  readonly valid = computed(() => this.name().trim().length > 1);

  isSelected(id: string): boolean {
    return this.selected().includes(id);
  }

  toggle(id: string): void {
    this.selected.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  onSubmit(): void {
    if (!this.valid()) {
      this.localError.set(this.transloco.translate('screenGroups.create.errorNameLength'));
      return;
    }
    this.localError.set('');
    const split = this.mode() === 'split';
    this.create.emit({
      request: {
        name: this.name().trim(),
        mode: this.mode(),
        color: this.color(),
        icon: 'Groups',
        ...(split ? { gridColumns: this.cols(), gridRows: this.rows() } : {}),
      },
      // Multi-select assigns mirror screens directly; split walls are filled in the detail view.
      screenIds: split ? [] : this.selected(),
    });
  }
}
