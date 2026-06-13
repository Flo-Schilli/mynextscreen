import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { StorageInfo } from '../content/content.model';
import { UsageBar } from './usage-bar';

/**
 * Presentational original + transcoded storage usage bars derived from a
 * (non-null) {@link StorageInfo}. Used wherever an organisation's storage
 * limits vs. usage are shown — the user dashboard, the instance-admin org
 * detail and the org-admin storage settings.
 */
@Component({
  selector: 'app-storage-usage-bars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UsageBar],
  template: `
    <app-usage-bar
      label="Originals"
      [usedBytes]="storage().originalUsedBytes"
      [totalBytes]="storage().originalLimitBytes"
      variant="accent"
    />
    <app-usage-bar
      label="Transcoded"
      [usedBytes]="storage().transcodedUsedBytes"
      [totalBytes]="storage().transcodedLimitBytes"
      variant="purple"
    />
  `,
})
export class StorageUsageBars {
  readonly storage = input.required<StorageInfo>();
}
