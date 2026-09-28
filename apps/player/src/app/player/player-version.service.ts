import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface VersionInfo {
  version: string;
}

function isVersionInfo(value: unknown): value is VersionInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as VersionInfo).version === 'string'
  );
}

/**
 * Reads the build-time `/version.json` the production image writes, so the
 * player can report which build is running on a screen.
 *
 * That report is what makes the screen-session rollout decidable: the step that
 * stops accepting the raw API key is irreversible, and "no version reported"
 * is how an un-migrated player looks. Absent in dev, where the file does not
 * exist — the heartbeat then simply carries nothing.
 */
@Injectable({ providedIn: 'root' })
export class PlayerVersionService {
  private readonly http = inject(HttpClient);
  private readonly _version = signal<string | null>(null);
  readonly version = this._version.asReadonly();

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const info = await firstValueFrom(this.http.get<unknown>('/version.json'));
      if (isVersionInfo(info) && info.version !== '0.0.0-dev') {
        this._version.set(info.version);
      }
    } catch {
      // No version.json (dev/test): report nothing rather than something wrong.
    }
  }
}
