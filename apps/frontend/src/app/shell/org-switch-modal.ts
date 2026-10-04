import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { OrgWithRole } from './organisation-state.service';
import { formatRole } from './format-role';
import { OverlayComponent, ModalComponent } from '../ui/overlay.component';
import { IconComponent } from '../ui/icon.component';

/**
 * Organisation-switch modal — Phase 2 reskin on mns-overlay / mns-modal.
 * Same data/behaviour as before; rebuilt on the new UI primitives.
 */
@Component({
  selector: 'app-org-switch-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, IconComponent, TranslocoDirective],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal [title]="t('shell.topbar.switchOrg')" icon="Building" (closed)="dismiss.emit()">
        <!-- org list -->
        <ul class="org-list">
          @for (org of organisations(); track org.id) {
            <li>
              <button
                type="button"
                class="org-option"
                [class.selected]="org.id === selectedOrgId()"
                [attr.aria-current]="org.id === selectedOrgId() ? 'true' : null"
                (click)="selectOrg.emit(org.id)"
              >
                <span class="org-option-text">
                  <span class="org-option-name">{{ org.name }}</span>
                  <span class="org-option-role">{{ formatRole(org.role) }}</span>
                </span>
                @if (org.id === selectedOrgId()) {
                  <mns-icon class="org-option-check" name="Check" [size]="18" aria-hidden="true" />
                }
              </button>
            </li>
          }
        </ul>

        <!-- footer slot -->
        <div slot="footer" class="modal-footer">
          <button type="button" class="btn-secondary btn-secondary" (click)="dismiss.emit()">
            {{ t('common.actions.close') }}
          </button>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
  styles: `
    .org-list {
      list-style: none;
      margin: 0 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 22rem;
      overflow-y: auto;
    }
    .org-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      padding: 12px 14px;
      text-align: left;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      cursor: pointer;
      transition:
        background 0.12s,
        border-color 0.12s;
    }
    .org-option:hover {
      background: var(--hover);
    }
    .org-option.selected {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .org-option:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }
    .org-option-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .org-option-name {
      font-size: 15px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .org-option-role {
      font-size: 12px;
      color: var(--text-muted);
    }
    .org-option-check {
      flex-shrink: 0;
      color: var(--accent);
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0 24px 20px;
    }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 38px;
      padding: 0 18px;
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: var(--surface-2);
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.12s;
    }
    .btn-secondary:hover {
      background: var(--hover);
    }
  `,
})
export class OrgSwitchModal {
  readonly organisations = input.required<OrgWithRole[]>();
  readonly selectedOrgId = input.required<string | null>();

  readonly selectOrg = output<string>();
  readonly dismiss = output<void>();

  protected readonly formatRole = formatRole;
}
