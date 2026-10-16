import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { BtnComponent } from '../ui';

/**
 * The one way back out of a detail view.
 *
 * Every detail page had hand-rolled its own: three slightly different pills
 * built from raw classes, one of them styled in a component stylesheet, and the
 * site agent's outline button. They are all this now.
 *
 * Pass `route` for a plain link, or leave it off and handle `back` — a few of
 * these views are opened in place by their parent and have nowhere to route to.
 *
 * @example
 * <app-back-link route="/screen-groups" />
 * <app-back-link (back)="dismiss.emit()" />
 */
@Component({
  selector: 'app-back-link',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BtnComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      @if (route(); as target) {
        <a [routerLink]="target" class="no-underline">
          <mns-btn variant="outline" icon="ChevronLeft">{{
            label() || t('common.actions.back')
          }}</mns-btn>
        </a>
      } @else {
        <mns-btn variant="outline" icon="ChevronLeft" (mnsClick)="back.emit()">
          {{ label() || t('common.actions.back') }}
        </mns-btn>
      }
    </ng-container>
  `,
  host: { style: 'display:contents' },
})
export class BackLink {
  readonly route = input<string | undefined>(undefined);
  /** Defaults to the localized "Back". */
  readonly label = input<string>('');

  readonly back = output<void>();
}
