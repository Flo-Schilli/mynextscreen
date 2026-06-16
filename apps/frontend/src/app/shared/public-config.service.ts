import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface PublicConfig {
  playerUrl: string;
}

/** Shown until /api/config resolves (and if it fails). */
const DEFAULT_PLAYER_URL = 'screen.mynextscreen.app';

/**
 * Reads the backend's public, env-driven instance config (`GET /api/config`)
 * once at startup and exposes it as signals. Currently just the player URL
 * shown in the add-screen pairing hint. A failed fetch leaves the dev-friendly
 * default in place, so the UI always has something to render.
 */
@Injectable({ providedIn: 'root' })
export class PublicConfigService {
  private readonly http = inject(HttpClient);

  readonly playerUrl = signal<string>(DEFAULT_PLAYER_URL);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const config = await firstValueFrom(this.http.get<PublicConfig>('/api/config'));
      if (config?.playerUrl) {
        this.playerUrl.set(config.playerUrl);
      }
    } catch {
      // Backend unreachable / no config — keep the default.
    }
  }
}
