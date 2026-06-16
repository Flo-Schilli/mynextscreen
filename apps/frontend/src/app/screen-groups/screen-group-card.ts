import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CardComponent, BadgeComponent, BtnComponent, IconComponent, IconName } from '../ui';
import { ScreenGroup } from './screen-group.model';

/**
 * Presentational screen-group card: gradient icon tile, name + screen count,
 * mode badge, a mini preview strip (up to 4 monitor placeholders) and a ghost
 * "Open" action. The parent owns navigation; the card only emits `open`.
 */
@Component({
  selector: 'app-screen-group-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, BadgeComponent, BtnComponent, IconComponent],
  template: `
    <mns-card [hover]="true" [clickable]="true">
      <div
        class="cursor-pointer"
        (click)="open.emit(group())"
        (keydown.enter)="open.emit(group())"
        tabindex="0"
        role="button"
      >
        <div class="flex items-center gap-3 mb-[15px]">
          <span
            class="grid place-items-center w-11 h-11 rounded-xl text-white flex-shrink-0"
            [style.background]="gradient()"
          >
            <mns-icon [name]="iconName()" [size]="22" />
          </span>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-[15.5px] truncate">{{ group().name }}</div>
            <div class="text-[12.5px] text-muted">
              {{ screenCount() }} screen{{ screenCount() === 1 ? '' : 's' }}
            </div>
          </div>
          <mns-badge
            [tone]="group().mode === 'split' ? 'accent' : 'neutral'"
            [icon]="group().mode === 'split' ? 'Grid' : 'Copy'"
          >
            {{ modeLabel() }}
          </mns-badge>
        </div>

        <!-- mini preview strip -->
        <div class="flex gap-[5px] mb-3.5">
          @for (s of strip(); track $index) {
            <div
              class="flex-1 max-w-[92px] h-[50px] rounded-md overflow-hidden border border-border relative"
              [style.background]="s ? gradient() : 'var(--surface-3)'"
            >
              @if (s) {
                <div
                  class="absolute inset-0"
                  style="background: linear-gradient(180deg, rgba(255,255,255,.12), transparent 50%, rgba(0,0,0,.2))"
                ></div>
              }
            </div>
          }
        </div>

        <div class="flex items-center justify-between">
          <span class="text-[12.5px] text-muted inline-flex items-center gap-1.5">
            <mns-icon name="Image" [size]="14" />{{ contentLabel() }}
          </span>
          <mns-btn variant="ghost" size="sm" iconRight="Arrow">Open</mns-btn>
        </div>
      </div>
    </mns-card>
  `,
})
export class ScreenGroupCard {
  readonly group = input.required<ScreenGroup>();
  readonly open = output<ScreenGroup>();

  readonly iconName = computed<IconName>(() => {
    const allowed: IconName[] = ['Groups', 'Layers', 'Cast', 'Grid', 'Copy', 'Screens'];
    const icon = this.group().icon as IconName;
    return allowed.includes(icon) ? icon : 'Groups';
  });

  readonly gradient = computed(
    () =>
      `linear-gradient(135deg, ${this.group().color}, color-mix(in srgb, ${this.group().color} 55%, #fff))`,
  );

  readonly screenCount = computed(() => this.group().screens.length);

  readonly modeLabel = computed(() => {
    const g = this.group();
    return g.mode === 'split' ? `${g.gridColumns ?? 1}×${g.gridRows ?? 1}` : 'Mirror';
  });

  readonly contentLabel = computed(() => this.group().name.split(' ')[0].toUpperCase().slice(0, 9));

  /** Up to 4 placeholders, at least 2 so the strip never collapses. */
  readonly strip = computed<(boolean | null)[]>(() => {
    const n = Math.min(this.group().screens.length, 4);
    if (n === 0) return [null, null];
    return Array.from({ length: n }, () => true);
  });
}
