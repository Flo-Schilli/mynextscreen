import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';

export interface PlayerAppMeta {
  slug: string;
  name: string;
  downloadAvailable: boolean;
}

interface AppInfo {
  id: string;
  version: string;
}

interface PlayerAppDefinition {
  slug: string;
  name: string;
  appId: string;
  version: string;
}

/**
 * Repo-owned catalogue of native player apps. Only the display name is declared
 * here — id and version are read from the app's own `appinfo.json`, which is
 * also what `ares-package` names the IPK after. A second, hardcoded copy of the
 * id is how the download silently disappeared when the project was renamed.
 */
const PLAYER_APP_DEFS: Pick<PlayerAppDefinition, 'slug' | 'name'>[] = [
  { slug: 'lg-tvos', name: 'LG webOS' },
];

@Injectable()
export class PlayerAppsService {
  private readonly logger = new Logger(PlayerAppsService.name);
  private readonly appsBasePath = path.join(process.cwd(), 'player-applications');
  private readonly playerApps: PlayerAppDefinition[];

  constructor() {
    this.playerApps = PLAYER_APP_DEFS.map((def) => {
      const appInfo = this.readAppInfo(def.slug);
      return { ...def, appId: appInfo?.id ?? '', version: appInfo?.version ?? '0.0.0' };
    });
  }

  listApps(): PlayerAppMeta[] {
    return this.playerApps.map((app) => ({
      slug: app.slug,
      name: app.name,
      downloadAvailable: this.binaryExists(app),
    }));
  }

  async getGuideHtml(slug: string): Promise<string> {
    const app = this.findApp(slug);
    const guidePath = path.join(this.appsBasePath, app.slug, 'guide.md');

    if (!fs.existsSync(guidePath)) {
      throw new NotFoundException(`Guide for "${slug}" not found`);
    }

    const markdown = fs.readFileSync(guidePath, 'utf-8');
    return marked(markdown) as Promise<string>;
  }

  getBinaryPath(slug: string): string {
    const app = this.findApp(slug);

    if (!this.binaryExists(app)) {
      throw new NotFoundException(`Binary for "${slug}" not available`);
    }

    return path.join(this.appsBasePath, app.slug, 'dist', this.binaryFilename(app));
  }

  getBinaryFilename(slug: string): string {
    const app = this.findApp(slug);
    return this.binaryFilename(app);
  }

  /**
   * Reads id + version from the app manifest. A missing or malformed manifest
   * only costs the download (and is logged) — the guide stays reachable.
   */
  private readAppInfo(slug: string): AppInfo | null {
    const appinfoPath = path.join(this.appsBasePath, slug, 'appinfo.json');

    try {
      const parsed = JSON.parse(fs.readFileSync(appinfoPath, 'utf-8')) as Partial<AppInfo>;
      if (!parsed.id || !parsed.version) {
        this.logger.warn(`${appinfoPath} is missing "id" or "version" — download disabled`);
        return null;
      }
      return { id: parsed.id, version: parsed.version };
    } catch (error) {
      this.logger.warn(`Cannot read ${appinfoPath} — download disabled: ${String(error)}`);
      return null;
    }
  }

  private findApp(slug: string): PlayerAppDefinition {
    const app = this.playerApps.find((a) => a.slug === slug);
    if (!app) throw new NotFoundException(`Player app "${slug}" not found`);
    return app;
  }

  private binaryFilename(app: PlayerAppDefinition): string {
    return `${app.appId}_${app.version}_all.ipk`;
  }

  private binaryExists(app: PlayerAppDefinition): boolean {
    if (!app.appId) return false;

    const binPath = path.join(this.appsBasePath, app.slug, 'dist', this.binaryFilename(app));
    return fs.existsSync(binPath);
  }
}
