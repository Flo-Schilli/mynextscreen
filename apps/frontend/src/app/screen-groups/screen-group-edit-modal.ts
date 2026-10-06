import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  OnInit,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { OverlayComponent, ModalComponent, BtnComponent, StepperComponent } from '../ui';
import { ScreenGroup, ScreenGroupMode, UpdateScreenGroupRequest } from './screen-group.model';
import { ScreenGroupModeToggle } from './screen-group-mode-toggle';

const COLORS = ['#6d6cf6', '#0ea5e9', '#ec4899', '#14b8a6', '#10b981', '#f59e0b', '#8b5cf6'];

/**
 * Edit-screen-group modal (mns-overlay/mns-modal). Seeds its field state once
 * from the `group` input on open and emits an {@link UpdateScreenGroupRequest}
 * when valid. The parent runs the HTTP work and feeds `saving`/`error` back in.
 */
@Component({
  selector: 'app-screen-group-edit-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OverlayComponent,
    ModalComponent,
    BtnComponent,
    StepperComponent,
    ScreenGroupModeToggle,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal
        [title]="t('screenGroups.edit.title')"
        icon="Pencil"
        [widthPx]="560"
        (closed)="dismiss.emit()"
      >
        <div class="flex flex-col gap-5">
          <label class="block">
            <span class="block text-[12.5px] font-semibold text-muted mb-2">{{
              t('screenGroups.edit.nameLabel')
            }}</span>
            <input
              class="w-full px-3 py-2.5 rounded-[10px] text-sm bg-surface-2 border border-border-strong text-text outline-none"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
            />
          </label>

          <div>
            <span class="block text-[12.5px] font-semibold text-muted mb-2.5">{{
              t('screenGroups.edit.colourLabel')
            }}</span>
            <div class="flex gap-2.5">
              @for (c of colors; track c) {
                <button
                  type="button"
                  class="w-7 h-7 rounded-lg cursor-pointer"
                  [style.background]="c"
                  [style.border]="color() === c ? '2px solid #fff' : '2px solid transparent'"
                  [style.box-shadow]="color() === c ? '0 0 0 2px ' + c : 'none'"
                  [attr.aria-label]="t('screenGroups.edit.colourAria', { colour: c })"
                  (click)="color.set(c)"
                ></button>
              }
            </div>
          </div>

          <div>
            <span class="block text-[12.5px] font-semibold text-muted mb-2.5">{{
              t('screenGroups.edit.displayModeLabel')
            }}</span>
            <app-screen-group-mode-toggle [value]="mode()" (modeChange)="mode.set($event)" />
          </div>

          @if (mode() === 'split') {
            <div class="p-4 rounded-[13px] bg-surface-2 border border-border flex flex-col gap-3.5">
              <mns-stepper
                [label]="t('screenGroups.edit.columns')"
                [(value)]="cols"
                [min]="1"
                [max]="4"
              />
              <mns-stepper
                [label]="t('screenGroups.edit.rows')"
                [(value)]="rows"
                [min]="1"
                [max]="4"
              />
            </div>
          }

          @if (localError() || error()) {
            <p class="text-offline text-sm">{{ localError() || error() }}</p>
          }
        </div>

        <div slot="footer" class="flex gap-2.5 px-6 py-5 border-t border-border">
          <mns-btn variant="outline" [full]="true" (mnsClick)="dismiss.emit()">{{
            t('common.actions.cancel')
          }}</mns-btn>
          <mns-btn
            variant="primary"
            [full]="true"
            icon="Check"
            [disabled]="saving()"
            (mnsClick)="onSubmit()"
            >{{
              saving() ? t('screenGroups.edit.saving') : t('screenGroups.edit.saveChanges')
            }}</mns-btn
          >
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class ScreenGroupEditModal implements OnInit {
  readonly group = input.required<ScreenGroup>();
  readonly saving = input.required<boolean>();
  readonly error = input.required<string>();

  readonly save = output<UpdateScreenGroupRequest>();
  readonly dismiss = output<void>();

  private readonly transloco = inject(TranslocoService);

  protected readonly colors = COLORS;

  protected readonly name = signal('');
  protected readonly color = signal(COLORS[0]);
  protected readonly mode = signal<ScreenGroupMode>('mirror');
  protected readonly cols = signal(2);
  protected readonly rows = signal(2);
  protected readonly localError = signal('');

  readonly valid = computed(() => this.name().trim().length > 0);

  ngOnInit(): void {
    const group = this.group();
    this.name.set(group.name);
    this.color.set(group.color || COLORS[0]);
    this.mode.set(group.mode);
    this.cols.set(group.gridColumns ?? 2);
    this.rows.set(group.gridRows ?? 2);
  }

  onSubmit(): void {
    if (!this.valid()) {
      this.localError.set(this.transloco.translate('screenGroups.edit.errorNameRequired'));
      return;
    }
    this.localError.set('');
    const split = this.mode() === 'split';
    this.save.emit({
      name: this.name().trim(),
      mode: this.mode(),
      color: this.color(),
      ...(split ? { gridColumns: this.cols(), gridRows: this.rows() } : {}),
    });
  }
}
