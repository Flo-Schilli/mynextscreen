import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { EventScheduleService } from './event-schedule.service';
import { EventSchedulePreviewItem, EventScheduleRule } from './event-schedule.model';
import {
  EventScheduleFormValue,
  emptyEventScheduleForm,
  eventScheduleFormFrom,
  previewTargetName,
  targetNames,
  targetOptions,
  toEventScheduleRequest,
  windowCrossesMidnight,
} from './event-schedule-state';
import { EventScheduleRuleModal } from './event-schedule-rule-modal';
import { apiErrorMessage } from './source-form-state';
import { PlaylistService } from '../playlists/playlist.service';
import { Playlist } from '../playlists/playlist.model';
import { ScreenService } from '../screens/screen.service';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { ToastService } from '../shared/toast/toast.service';
import { LocaleDatePipe } from '../i18n/locale-format.pipes';
import {
  BadgeComponent,
  BadgeTone,
  BtnComponent,
  CardComponent,
  CardHeadComponent,
  ModalComponent,
  OverlayComponent,
  SelectOption,
  SwitchComponent,
} from '../ui';

interface NamedRef {
  id: string;
  name: string;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  scheduled: 'online',
  conflict: 'warning',
  pending: 'neutral',
  excluded: 'neutral',
};

/**
 * Event schedule rules of one source: "on every event day at these venues,
 * play this playlist from … to … on these screens". Each rule lists its
 * upcoming events with the status per target, and single events can be left
 * out. Viewers read.
 */
@Component({
  selector: 'app-source-event-schedules',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    BtnComponent,
    CardComponent,
    CardHeadComponent,
    EventScheduleRuleModal,
    LocaleDatePipe,
    ModalComponent,
    OverlayComponent,
    SwitchComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-card *transloco="let t">
      <mns-card-head
        [title]="t('sources.schedules.title')"
        [sub]="t('sources.schedules.sub')"
        icon="Calendar"
      >
        @if (canEdit()) {
          <div slot="right">
            <mns-btn
              class="add-rule"
              variant="outline"
              size="sm"
              icon="Plus"
              (mnsClick)="openCreate()"
            >
              {{ t('sources.schedules.add') }}
            </mns-btn>
          </div>
        }
      </mns-card-head>

      @if (rules().length === 0) {
        <p class="text-sm text-muted py-2">{{ t('sources.schedules.empty') }}</p>
      } @else {
        <ul class="flex flex-col divide-y divide-border">
          @for (rule of rules(); track rule.id) {
            <li class="rule-row py-3">
              <div class="flex flex-wrap items-start gap-3">
                <span
                  class="mt-1 w-3 h-3 rounded-full flex-shrink-0"
                  [style.background]="rule.colour"
                ></span>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-semibold">{{ rule.name }}</span>
                    @if (!rule.enabled) {
                      <mns-badge>{{ t('sources.schedules.paused') }}</mns-badge>
                    }
                    @if (conflictCount(rule) > 0) {
                      <mns-badge class="conflict-badge" tone="warning" icon="Alert">
                        {{ t('sources.schedules.conflicts', { count: conflictCount(rule) }) }}
                      </mns-badge>
                    }
                  </div>
                  <div class="mt-1 text-[12.5px] text-muted">
                    {{ rule.venues.join(', ') }} · {{ playlistName(rule.playlistId) }} ·
                    <span class="font-mono">{{ rule.windowStart }}–{{ rule.windowEnd }}</span>
                    @if (nextDay(rule)) {
                      <span>&nbsp;({{ t('sources.schedules.nextDay') }})</span>
                    }
                  </div>
                  <div class="mt-0.5 text-[12.5px] text-faint">
                    {{ targetsOf(rule).join(', ') }}
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  @if (canEdit()) {
                    <mns-switch
                      [checked]="rule.enabled"
                      [disabled]="busy()"
                      (toggled)="setEnabled(rule, $event)"
                    />
                  }
                  <mns-btn
                    class="toggle-preview"
                    variant="ghost"
                    size="sm"
                    icon="Eye"
                    [title]="t('sources.schedules.preview')"
                    (mnsClick)="togglePreview(rule)"
                  />
                  @if (canEdit()) {
                    <mns-btn
                      class="edit-rule"
                      variant="ghost"
                      size="sm"
                      icon="Pencil"
                      [title]="t('common.actions.edit')"
                      (mnsClick)="openEdit(rule)"
                    />
                    <mns-btn
                      class="delete-rule"
                      variant="ghost"
                      size="sm"
                      icon="Trash"
                      [title]="t('common.actions.delete')"
                      (mnsClick)="deleting.set(rule)"
                    />
                  }
                </div>
              </div>

              @if (expandedId() === rule.id) {
                <div class="rule-preview mt-3 ml-6">
                  @if (preview().length === 0) {
                    <p class="text-[12.5px] text-muted">
                      {{ t('sources.schedules.previewEmpty') }}
                    </p>
                  } @else {
                    <ul class="flex flex-col gap-2">
                      @for (item of preview(); track item.sourceEventId) {
                        <li
                          class="preview-item flex flex-wrap items-center gap-2 text-[12.5px]"
                          [class.opacity-60]="item.excluded"
                        >
                          <span class="font-mono text-muted w-[7.5rem]">
                            {{ item.eventDate | localeDate: 'EEE, d. MMM' }}
                          </span>
                          <span class="font-semibold min-w-0 flex-1 truncate">
                            {{ item.title }}
                            @if (item.cancelled) {
                              <span class="text-offline"
                                >({{ t('sources.schedules.cancelled') }})</span
                              >
                            }
                          </span>
                          @for (target of item.targets; track $index) {
                            <mns-badge [tone]="tone(target.status)">
                              {{ targetName(target) }}:
                              {{ t('sources.schedules.status.' + target.status) }}
                            </mns-badge>
                          }
                          @if (canEdit()) {
                            <mns-btn
                              class="toggle-exclusion"
                              variant="ghost"
                              size="sm"
                              [disabled]="busy()"
                              (mnsClick)="setExcluded(rule, item, !item.excluded)"
                            >
                              {{
                                item.excluded
                                  ? t('sources.schedules.include')
                                  : t('sources.schedules.exclude')
                              }}
                            </mns-btn>
                          }
                        </li>
                      }
                    </ul>
                  }
                </div>
              }
            </li>
          }
        </ul>
      }

      @if (editing(); as edit) {
        <app-event-schedule-rule-modal
          [title]="
            edit.rule ? t('sources.schedules.editTitle') : t('sources.schedules.createTitle')
          "
          [initial]="edit.form"
          [venueOptions]="venueOptions()"
          [playlistOptions]="playlistOptions()"
          [targetOptions]="targetPickerOptions()"
          [saving]="busy()"
          (save)="save($event)"
          (dismiss)="editing.set(null)"
        />
      }

      @if (deleting(); as rule) {
        <mns-overlay (closed)="deleting.set(null)">
          <mns-modal
            [title]="t('sources.schedules.deleteTitle')"
            icon="Trash"
            (closed)="deleting.set(null)"
          >
            <p class="px-6 pt-4 text-sm text-muted">
              {{ t('sources.schedules.deleteConfirm', { name: rule.name }) }}
            </p>
            <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-4">
              <mns-btn variant="outline" (mnsClick)="deleting.set(null)">{{
                t('common.actions.cancel')
              }}</mns-btn>
              <mns-btn
                class="confirm-delete"
                variant="danger"
                [disabled]="busy()"
                (mnsClick)="remove(rule)"
              >
                {{ busy() ? t('common.actions.deleting') : t('common.actions.delete') }}
              </mns-btn>
            </div>
          </mns-modal>
        </mns-overlay>
      }
    </mns-card>
  `,
  host: { class: 'block' },
})
export class SourceEventSchedules {
  private readonly service = inject(EventScheduleService);
  private readonly playlistService = inject(PlaylistService);
  private readonly screenService = inject(ScreenService);
  private readonly groupService = inject(ScreenGroupService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly orgId = input.required<string>();
  readonly sourceId = input.required<string>();
  /** Canonical venue names of the source, for the venue picker. */
  readonly venues = input.required<string[]>();
  readonly canEdit = input(false);
  /** Bumped by the parent after a sync or an alias change: rules reconciled, reload. */
  readonly reload = input(0);

  protected readonly rules = signal<EventScheduleRule[]>([]);
  protected readonly playlists = signal<Playlist[]>([]);
  protected readonly screens = signal<NamedRef[]>([]);
  protected readonly groups = signal<NamedRef[]>([]);
  protected readonly expandedId = signal<string | null>(null);
  protected readonly preview = signal<EventSchedulePreviewItem[]>([]);
  protected readonly editing = signal<{
    rule: EventScheduleRule | null;
    form: EventScheduleFormValue;
  } | null>(null);
  protected readonly deleting = signal<EventScheduleRule | null>(null);
  protected readonly busy = signal(false);

  protected readonly venueOptions = computed<SelectOption[]>(() => {
    // Keep venues a rule names although no current event uses them.
    const names = new Set([...this.venues(), ...(this.editing()?.form.venues ?? [])]);
    return [...names].map((name) => ({ value: name, label: name }));
  });
  protected readonly playlistOptions = computed<SelectOption[]>(() =>
    this.playlists().map((p) => ({ value: p.id, label: p.name })),
  );
  protected readonly targetPickerOptions = computed<SelectOption[]>(() =>
    targetOptions(this.screens(), this.groups(), (name) =>
      this.transloco.translate('sources.schedules.groupOption', { name }),
    ),
  );

  constructor() {
    effect(() => {
      const orgId = this.orgId();
      const sourceId = this.sourceId();
      this.reload();
      untracked(() => this.load(orgId, sourceId));
    });
  }

  protected conflictCount(rule: EventScheduleRule): number {
    return rule.lastReconcileSummary?.conflicts.length ?? 0;
  }

  protected nextDay(rule: EventScheduleRule): boolean {
    return windowCrossesMidnight(rule.windowStart, rule.windowEnd);
  }

  protected playlistName(id: string): string {
    return this.playlists().find((p) => p.id === id)?.name ?? '?';
  }

  protected targetsOf(rule: EventScheduleRule): string[] {
    return targetNames(rule, this.screens(), this.groups());
  }

  protected targetName(target: { screenId: string | null; groupId: string | null }): string {
    return previewTargetName(target, this.screens(), this.groups());
  }

  protected tone(status: string): BadgeTone {
    return STATUS_TONE[status] ?? 'neutral';
  }

  protected openCreate(): void {
    this.editing.set({ rule: null, form: emptyEventScheduleForm() });
  }

  protected openEdit(rule: EventScheduleRule): void {
    this.editing.set({ rule, form: eventScheduleFormFrom(rule) });
  }

  protected togglePreview(rule: EventScheduleRule): void {
    if (this.expandedId() === rule.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(rule.id);
    this.loadPreview(rule.id);
  }

  protected save(form: EventScheduleFormValue): void {
    const rule = this.editing()?.rule ?? null;
    const request = toEventScheduleRequest(form);
    const call = rule
      ? this.service.update(this.orgId(), this.sourceId(), rule.id, request)
      : this.service.create(this.orgId(), this.sourceId(), request);
    this.busy.set(true);
    call.subscribe({
      next: (saved) => {
        this.busy.set(false);
        this.editing.set(null);
        this.replaceRule(saved);
        this.toast.success(this.transloco.translate('sources.schedules.toast.saved'));
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.error(
          apiErrorMessage(err, this.transloco.translate('sources.schedules.toast.saveFailed')),
        );
      },
    });
  }

  protected setEnabled(rule: EventScheduleRule, enabled: boolean): void {
    this.busy.set(true);
    this.service.update(this.orgId(), this.sourceId(), rule.id, { enabled }).subscribe({
      next: (saved) => {
        this.busy.set(false);
        this.replaceRule(saved);
      },
      error: () => {
        this.busy.set(false);
        this.toast.error(this.transloco.translate('sources.schedules.toast.saveFailed'));
      },
    });
  }

  protected setExcluded(
    rule: EventScheduleRule,
    item: EventSchedulePreviewItem,
    excluded: boolean,
  ): void {
    this.busy.set(true);
    this.service
      .setExcluded(this.orgId(), this.sourceId(), rule.id, item.sourceEventId, excluded)
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.loadRules(this.orgId(), this.sourceId());
          this.loadPreview(rule.id);
        },
        error: () => {
          this.busy.set(false);
          this.toast.error(this.transloco.translate('sources.schedules.toast.saveFailed'));
        },
      });
  }

  protected remove(rule: EventScheduleRule): void {
    this.busy.set(true);
    this.service.delete(this.orgId(), this.sourceId(), rule.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deleting.set(null);
        this.rules.update((rules) => rules.filter((r) => r.id !== rule.id));
        if (this.expandedId() === rule.id) this.expandedId.set(null);
        this.toast.success(this.transloco.translate('sources.schedules.toast.deleted'));
      },
      error: () => {
        this.busy.set(false);
        this.toast.error(this.transloco.translate('sources.schedules.toast.deleteFailed'));
      },
    });
  }

  private load(orgId: string, sourceId: string): void {
    forkJoin({
      playlists: this.playlistService.getAll(orgId),
      screens: this.screenService.getAll(orgId),
      groups: this.groupService.getAll(orgId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ playlists, screens, groups }) => {
          this.playlists.set(playlists);
          this.screens.set(screens.map((s) => ({ id: s.id, name: s.name })));
          this.groups.set(groups.map((g) => ({ id: g.id, name: g.name })));
        },
        error: () =>
          this.toast.error(this.transloco.translate('sources.schedules.toast.loadFailed')),
      });
    this.loadRules(orgId, sourceId);
    const expanded = this.expandedId();
    if (expanded) this.loadPreview(expanded);
  }

  private loadRules(orgId: string, sourceId: string): void {
    this.service
      .getAll(orgId, sourceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rules) => this.rules.set(rules),
        error: () =>
          this.toast.error(this.transloco.translate('sources.schedules.toast.loadFailed')),
      });
  }

  private loadPreview(ruleId: string): void {
    this.service
      .preview(this.orgId(), this.sourceId(), ruleId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          if (this.expandedId() === ruleId) this.preview.set(items);
        },
        error: () =>
          this.toast.error(this.transloco.translate('sources.schedules.toast.loadFailed')),
      });
  }

  /** Puts a saved rule in place, or appends a new one; an open preview reloads. */
  private replaceRule(saved: EventScheduleRule): void {
    this.rules.update((rules) =>
      rules.some((r) => r.id === saved.id)
        ? rules.map((r) => (r.id === saved.id ? saved : r))
        : [...rules, saved],
    );
    if (this.expandedId() === saved.id) this.loadPreview(saved.id);
  }
}
