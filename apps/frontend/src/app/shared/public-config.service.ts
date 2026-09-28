import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface PublicConfig {
  playerUrl: string;
}

/**
 * Reads the backend's public, env-driven instance config (`GET /api/config`)
 * once at startup and exposes it as signals. Currently just the player URL
 * shown in the add-screen pairing hint. It stays empty when the backend does
 * not know one, and the hint then says so instead of naming a host this
 * instance has nothing to do with.
 */
@Injectable({ providedIn: 'root' })
export class PublicConfigService {
  private readonly http = inject(HttpClient);

  readonly playerUrl = signal<string>('');

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
