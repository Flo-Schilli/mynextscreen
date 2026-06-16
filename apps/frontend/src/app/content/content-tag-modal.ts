import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayComponent, ModalComponent, BtnComponent, SFieldComponent } from '../ui';

/**
 * Presentational modal for bulk add/remove tags. Owns nothing but its own view;
 * the comma-separated tag text is two-way bound via {@link model} so the parent
 * stays the source of truth for the value it later parses. Emits confirm/cancel;
 * the parent drives the show flag and the bulk request.
 *
 * Built on the shared `mns-overlay` / `mns-modal` primitives. The `.tag-chip`,
 * `.tag-suggestions` and `#bulkTagInput` hooks are load-bearing for specs.
 */
@Component({
  selector: 'app-content-tag-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, OverlayComponent, ModalComponent, BtnComponent, SFieldComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal [title]="title()" icon="Hash" (closed)="dismiss.emit()">
        <mns-sfield label="Tags (comma-separated)">
          <input
            id="bulkTagInput"
            type="text"
            [(ngModel)]="value"
            name="bulkTagInput"
            placeholder="e.g. promo, seasonal"
            class="w-full px-3 py-2.5 rounded-[10px] bg-surface-2 border border-border-strong text-sm text-text outline-none transition-all duration-150 focus:border-accent placeholder:text-faint"
          />
        </mns-sfield>

        @if (suggestions().length > 0) {
          <div class="tag-suggestions mt-3 flex flex-wrap gap-1.5">
            @for (tag of suggestions(); track tag) {
              <button
                type="button"
                class="tag-chip px-3 py-1 rounded-[99px] border text-xs font-medium cursor-pointer transition-all duration-150"
                [class]="
                  selectedTags().includes(tag)
                    ? 'active border-accent bg-accent text-white'
                    : 'border-border bg-surface-2 text-muted hover:border-muted hover:text-text'
                "
                (click)="toggleTag(tag)"
              >
                {{ tag }}
              </button>
            }
          </div>
        }

        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
          <mns-btn variant="primary" [disabled]="!value().trim()" (mnsClick)="confirm.emit()">
            {{ title() }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class ContentTagModal {
  readonly mode = input.required<'add' | 'remove'>();
  readonly suggestions = input.required<string[]>();
  readonly value = model.required<string>();
  readonly confirm = output<void>();
  readonly dismiss = output<void>();

  protected readonly title = computed(() => (this.mode() === 'add' ? 'Add Tags' : 'Remove Tags'));

  protected selectedTags(): string[] {
    return this.value()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  toggleTag(tag: string): void {
    const tags = this.selectedTags();
    const idx = tags.indexOf(tag);
    if (idx >= 0) {
      tags.splice(idx, 1);
    } else {
      tags.push(tag);
    }
    this.value.set(tags.join(', '));
  }
}
