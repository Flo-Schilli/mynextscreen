import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { MAX_VENUE_NAME_LENGTH, SourceVenue, VenueAlias } from './content-source.model';
import {
  VenueAliasRow,
  addAlias,
  aliasErrors,
  aliasRows,
  aliasRowsValid,
  aliasesFromRows,
  canonicalSuggestions,
  removeAlias,
  sameAliases,
  setCanonical,
} from './venue-alias-state';
import { BtnComponent, CardComponent, CardHeadComponent } from '../ui';

const INPUT_CLASS =
  'w-full min-w-0 px-3 py-1.5 rounded-[10px] bg-surface border border-border-strong text-sm text-text placeholder:text-faint outline-none focus:ring-[3px] disabled:opacity-60';

/**
 * Venue aliases of one source: every raw venue name of the current events
 * with the canonical name it is shown and filtered by. Editors map names and
 * add aliases for spellings the site does not use right now; viewers read.
 */
@Component({
  selector: 'app-source-venue-aliases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BtnComponent, CardComponent, CardHeadComponent, TranslocoDirective],
  template: `
    <mns-card *transloco="let t">
      <mns-card-head
        [title]="t('sources.aliases.title')"
        [sub]="t('sources.aliases.sub')"
        icon="MapPin"
      />
      @if (rows().length === 0) {
        <p class="text-sm text-muted py-2">{{ t('sources.aliases.empty') }}</p>
      } @else {
        <datalist [id]="listId">
          @for (name of suggestions(); track name) {
            <option [value]="name"></option>
          }
        </datalist>
        <div class="alias-table max-h-[440px] overflow-auto">
          <table class="w-full min-w-[560px] text-[13px]">
            <thead class="sticky top-0 bg-surface">
              <tr class="text-left text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
                <th class="py-2 pr-4 font-bold">{{ t('sources.aliases.raw') }}</th>
                <th class="py-2 pr-4 font-bold">{{ t('sources.aliases.events') }}</th>
                <th class="py-2 pr-4 font-bold">{{ t('sources.aliases.canonical') }}</th>
                <th class="py-2 w-10">
                  <span class="sr-only">{{ t('common.actions.delete') }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.raw) {
                <tr class="alias-row border-t border-border align-middle">
                  <td class="py-1.5 pr-4 font-semibold">{{ row.raw }}</td>
                  <td class="py-1.5 pr-4 text-muted font-mono">
                    {{ row.events ?? t('sources.aliases.notListed') }}
                  </td>
                  <td class="py-1.5 pr-4">
                    <input
                      class="alias-canonical {{ inputClass }}"
                      [style.--tw-ring-color]="'var(--accent-soft)'"
                      [attr.list]="listId"
                      [attr.aria-label]="t('sources.aliases.canonicalFor', { name: row.raw })"
                      [placeholder]="t('sources.aliases.keep')"
                      [maxLength]="maxLength"
                      [disabled]="disabled()"
                      [value]="row.canonical"
                      (input)="onCanonical(row, $event)"
                    />
                    @if (errors().get(row.raw); as error) {
                      <div class="alias-error mt-1 text-[12px] text-offline">
                        {{ t('sources.aliases.errors.' + error) }}
                      </div>
                    }
                  </td>
                  <td class="py-1.5">
                    @if (!disabled() && row.canonical !== '') {
                      <mns-btn
                        class="alias-remove"
                        variant="ghost"
                        size="sm"
                        icon="X"
                        [title]="t('sources.aliases.remove', { name: row.raw })"
                        (mnsClick)="remove(row)"
                      />
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!disabled()) {
        <div class="mt-4 flex flex-wrap items-end gap-2">
          <label class="flex-1 min-w-[180px] text-[12.5px] text-muted">
            {{ t('sources.aliases.newRaw') }}
            <input
              class="alias-new-raw mt-1 {{ inputClass }}"
              [style.--tw-ring-color]="'var(--accent-soft)'"
              [maxLength]="maxLength"
              [value]="newRaw()"
              (input)="newRaw.set(valueOf($event))"
            />
          </label>
          <label class="flex-1 min-w-[180px] text-[12.5px] text-muted">
            {{ t('sources.aliases.newCanonical') }}
            <input
              class="alias-new-canonical mt-1 {{ inputClass }}"
              [style.--tw-ring-color]="'var(--accent-soft)'"
              [attr.list]="listId"
              [maxLength]="maxLength"
              [value]="newCanonical()"
              (input)="newCanonical.set(valueOf($event))"
            />
          </label>
          <mns-btn
            class="alias-add"
            variant="outline"
            icon="Plus"
            [disabled]="!canAdd()"
            (mnsClick)="add()"
            >{{ t('sources.aliases.add') }}</mns-btn
          >
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-end gap-3">
          @if (dirty()) {
            <span class="text-[12.5px] text-faint">{{ t('sources.aliases.unsaved') }}</span>
          }
          <mns-btn
            class="save-aliases"
            [disabled]="!dirty() || !valid() || saving()"
            (mnsClick)="save()"
          >
            {{ saving() ? t('sources.detail.saving') : t('sources.aliases.save') }}
          </mns-btn>
        </div>
      }
    </mns-card>
  `,
  host: { class: 'block' },
})
export class SourceVenueAliases {
  readonly venues = input.required<SourceVenue[]>();
  readonly aliases = input.required<VenueAlias[]>();
  readonly disabled = input(false);
  readonly saving = input(false);
  readonly saved = output<VenueAlias[]>();

  protected readonly inputClass = INPUT_CLASS;
  protected readonly maxLength = MAX_VENUE_NAME_LENGTH;
  protected readonly listId = `venue-names-${Math.random().toString(36).slice(2, 8)}`;

  protected readonly rows = linkedSignal<VenueAliasRow[]>(() =>
    aliasRows(this.venues(), this.aliases()),
  );
  protected readonly newRaw = signal('');
  protected readonly newCanonical = signal('');

  protected readonly errors = computed(() => aliasErrors(this.rows()));
  protected readonly valid = computed(() => aliasRowsValid(this.rows()));
  protected readonly suggestions = computed(() => canonicalSuggestions(this.rows()));
  protected readonly dirty = computed(
    () => !sameAliases(aliasesFromRows(this.rows()), this.aliases()),
  );
  protected readonly canAdd = computed(() => {
    const raw = this.newRaw().trim();
    const canonical = this.newCanonical().trim();
    return raw !== '' && canonical !== '' && raw !== canonical;
  });

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected onCanonical(row: VenueAliasRow, event: Event): void {
    this.rows.set(setCanonical(this.rows(), row.raw, this.valueOf(event)));
  }

  protected remove(row: VenueAliasRow): void {
    this.rows.set(removeAlias(this.rows(), row.raw));
  }

  protected add(): void {
    if (!this.canAdd()) return;
    this.rows.set(addAlias(this.rows(), this.newRaw(), this.newCanonical()));
    this.newRaw.set('');
    this.newCanonical.set('');
  }

  protected save(): void {
    if (!this.dirty() || !this.valid()) return;
    this.saved.emit(aliasesFromRows(this.rows()));
  }
}
