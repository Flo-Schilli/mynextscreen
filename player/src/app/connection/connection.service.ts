import { inject, Injectable, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const STORAGE_KEY_URL = 'signage_server_url';
const STORAGE_KEY_API_KEY = 'signage_api_key';
const STORAGE_KEY_SCREEN_ID = 'signage_screen_id';
const STORAGE_KEY_ORG_ID = 'signage_org_id';

export interface ConnectionSettings {
  serverUrl: string;
  apiKey: string;
  screenId: string;
  organisationId: string;
}

@Injectable({ providedIn: 'root' })
export class ConnectionService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly onMessage = (event: MessageEvent): void => {
    const data = event.data;
    if (data == null || typeof data !== 'object' || data.type !== 'signage-connect') {
      return;
    }

    const { serverUrl, apiKey } = data;
    if (typeof serverUrl !== 'string' || !serverUrl || typeof apiKey !== 'string' || !apiKey) {
      return;
    }

    this.connect(serverUrl, apiKey);
  };

  constructor() {
    window.addEventListener('message', this.onMessage);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage);
  }

  private readonly _connected = signal(false);
  private readonly _serverUrl = signal('');
  private readonly _apiKey = signal('');
  private readonly _screenId = signal('');
  private readonly _organisationId = signal('');
  private readonly _error = signal('');
  private readonly _connecting = signal(false);

  readonly connected = this._connected.asReadonly();
  readonly serverUrl = this._serverUrl.asReadonly();
  readonly apiKey = this._apiKey.asReadonly();
  readonly screenId = this._screenId.asReadonly();
  readonly organisationId = this._organisationId.asReadonly();
  readonly error = this._error.asReadonly();
  readonly connecting = this._connecting.asReadonly();

  readonly hasSavedSettings = computed(() => {
    const url = localStorage.getItem(STORAGE_KEY_URL);
    const key = localStorage.getItem(STORAGE_KEY_API_KEY);
    return !!url && !!key;
  });

  async tryAutoConnect(): Promise<boolean> {
    const serverUrl = localStorage.getItem(STORAGE_KEY_URL);
    const apiKey = localStorage.getItem(STORAGE_KEY_API_KEY);
    const screenId = localStorage.getItem(STORAGE_KEY_SCREEN_ID);
    const organisationId = localStorage.getItem(STORAGE_KEY_ORG_ID);

    if (!serverUrl || !apiKey || !screenId || !organisationId) {
      return false;
    }

    this._serverUrl.set(serverUrl);
    this._apiKey.set(apiKey);
    this._screenId.set(screenId);
    this._organisationId.set(organisationId);

    try {
      await this.verifyConnection(serverUrl, apiKey, screenId);
      this._connected.set(true);
      return true;
    } catch {
      return false;
    }
  }

  async connect(serverUrl: string, apiKey: string): Promise<boolean> {
    this._error.set('');
    this._connecting.set(true);

    const normalizedUrl = serverUrl.replace(/\/+$/, '');

    try {
      const identity = await this.identify(normalizedUrl, apiKey);

      await this.verifyConnection(normalizedUrl, apiKey, identity.screenId);

      this._serverUrl.set(normalizedUrl);
      this._apiKey.set(apiKey);
      this._screenId.set(identity.screenId);
      this._organisationId.set(identity.organisationId);
      this._connected.set(true);

      localStorage.setItem(STORAGE_KEY_URL, normalizedUrl);
      localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
      localStorage.setItem(STORAGE_KEY_SCREEN_ID, identity.screenId);
      localStorage.setItem(STORAGE_KEY_ORG_ID, identity.organisationId);

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      this._error.set(message);
      return false;
    } finally {
      this._connecting.set(false);
    }
  }

  disconnect(): void {
    this._connected.set(false);
    this._serverUrl.set('');
    this._apiKey.set('');
    this._screenId.set('');
    this._organisationId.set('');
    this._error.set('');

    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_API_KEY);
    localStorage.removeItem(STORAGE_KEY_SCREEN_ID);
    localStorage.removeItem(STORAGE_KEY_ORG_ID);
  }

  private async identify(
    serverUrl: string,
    apiKey: string,
  ): Promise<{ screenId: string; organisationId: string }> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${apiKey}`,
    });

    try {
      return await firstValueFrom(
        this.http.get<{ screenId: string; organisationId: string }>(`${serverUrl}/api/screens/me`, {
          headers,
        }),
      );
    } catch {
      throw new Error('Invalid API key or server unreachable');
    }
  }

  private async verifyConnection(
    serverUrl: string,
    apiKey: string,
    screenId: string,
  ): Promise<void> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${apiKey}`,
    });

    try {
      await firstValueFrom(
        this.http.get(`${serverUrl}/api/screens/${screenId}/state`, {
          headers,
        }),
      );
    } catch {
      throw new Error('Server unreachable or invalid API key');
    }
  }
}
