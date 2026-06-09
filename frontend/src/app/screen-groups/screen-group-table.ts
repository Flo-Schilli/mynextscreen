import { Component, input, output } from '@angular/core';
import { ScreenGroup } from './screen-group.model';

/**
 * Presentational screen-groups table: name link, mode badge, grid size and
 * screen count, plus per-row edit/delete actions. The parent owns data loading
 * and the navigate/edit/delete handlers; this component only emits the clicked
 * group.
 */
@Component({
  selector: 'app-screen-group-table',
  standalone: true,
  template: `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Mode</th>
            <th>Grid Size</th>
            <th>Screen Count</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (group of groups(); track group.id) {
            <tr>
              <td class="name-cell">
                <a
                  class="group-link"
                  tabindex="0"
                  role="link"
                  (click)="view.emit(group)"
                  (keydown.enter)="view.emit(group)"
                  >{{ group.name }}</a
                >
              </td>
              <td>
                <span
                  class="mode-badge"
                  [class.mirror]="group.mode === 'mirror'"
                  [class.split]="group.mode === 'split'"
                >
                  {{ group.mode === 'mirror' ? 'Mirror' : 'Split' }}
                </span>
              </td>
              <td>
                {{
                  group.mode === 'split' && group.gridColumns && group.gridRows
                    ? group.gridColumns + 'x' + group.gridRows
                    : '-'
                }}
              </td>
              <td>{{ group.screens.length }}</td>
              <td class="actions-cell">
                <button class="btn btn-small btn-secondary" (click)="edit.emit(group)">Edit</button>
                <button class="btn btn-small btn-danger" (click)="delete.emit(group)">
                  Delete
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    /* Group name link */
    .group-link {
      color: var(--color-accent);
      cursor: pointer;
      text-decoration: none;
    }
    .group-link:hover {
      text-decoration: underline;
    }

    /* Mode badge */
    .mode-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      width: fit-content;
    }
    .mode-badge.mirror {
      background: #3b82f620;
      color: #3b82f6;
    }
    .mode-badge.split {
      background: #a855f720;
      color: #a855f7;
    }
  `,
})
export class ScreenGroupTable {
  readonly groups = input.required<ScreenGroup[]>();

  readonly view = output<ScreenGroup>();
  readonly edit = output<ScreenGroup>();
  readonly delete = output<ScreenGroup>();
}
