import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { OrgWithRole } from './organisation-state.service';
import { formatRole } from './format-role';

/**
 * Presentational organisation-switch modal: lists every organisation the user
 * belongs to with its role and marks the active one. The parent owns the
 * open/closed state and the actual selection; this component just emits the
 * chosen org id (or a dismiss intent). Only rendered when the user belongs to
 * more than one organisation.
 */
@Component({
  selector: 'app-org-switch-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Switch organisation"
      tabindex="0"
      (click)="dismiss.emit()"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="modal"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h2>Switch organisation</h2>
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
                  <svg
                    class="org-option-check"
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 10.5l4 4 8-9"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                }
              </button>
            </li>
          }
        </ul>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .org-list {
      list-style: none;
      margin: 0 0 0.5rem;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      max-height: 22rem;
      overflow-y: auto;
    }
    .org-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      width: 100%;
      padding: 0.75rem 0.875rem;
      text-align: left;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      color: var(--color-text-primary);
      cursor: pointer;
      transition:
        background 0.15s,
        border-color 0.15s;
    }
    .org-option:hover {
      background: var(--color-bg-tertiary);
    }
    .org-option.selected {
      border-color: var(--color-accent);
      background: var(--color-bg-tertiary);
    }
    .org-option:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 1px;
    }
    .org-option-text {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }
    .org-option-name {
      font-size: 0.9375rem;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .org-option-role {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .org-option-check {
      flex-shrink: 0;
      color: var(--color-accent);
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
