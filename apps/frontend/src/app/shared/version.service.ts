import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface VersionInfo {
  version: string;
  commit: string;
  builtAt: string;
}

function isVersionInfo(value: unknown): value is VersionInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['version'] === 'string'
  );
}

/**
 * Reads the build-time `/version.json` (written by the prod nginx image) once at
 * startup and exposes the app version as a signal. The file does not exist in
 * dev/test, so a failed fetch is swallowed and the version stays `null` (the
 * badge simply renders nothing). `/version.json` is outside `/api`, so the auth
 * interceptor leaves it untouched.
 */
@Injectable({ providedIn: 'root' })
export class VersionService {
  private readonly http = inject(HttpClient);

  readonly version = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const info = await firstValueFrom(this.http.get<unknown>('/version.json'));
      if (isVersionInfo(info) && info.version !== '0.0.0-dev') {
        this.version.set(info.version);
      }
    } catch {
      // No version.json (dev/test) — leave version null; the badge hides itself.
    }
  }
}
