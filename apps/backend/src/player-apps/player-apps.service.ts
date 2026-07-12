import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';

export interface PlayerAppMeta {
  slug: string;
  name: string;
  downloadAvailable: boolean;
}

interface PlayerAppDefinition {
  slug: string;
  name: string;
  appId: string;
  version: string;
}

function readAppVersion(slug: string, appsBasePath: string): string {
  const appinfoPath = path.join(appsBasePath, slug, 'appinfo.json');
  try {
    const raw = fs.readFileSync(appinfoPath, 'utf-8');
    return (JSON.parse(raw) as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const PLAYER_APP_DEFS: Omit<PlayerAppDefinition, 'version'>[] = [
  { slug: 'lg-tvos', name: 'LG webOS', appId: 'com.cbf.webos' },
];

@Injectable()
export class PlayerAppsService {
  private readonly appsBasePath = path.join(process.cwd(), 'player-applications');
  private readonly playerApps: PlayerAppDefinition[];

  constructor() {
    this.playerApps = PLAYER_APP_DEFS.map((def) => ({
      ...def,
      version: readAppVersion(def.slug, this.appsBasePath),
    }));
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

  private findApp(slug: string): PlayerAppDefinition {
    const app = this.playerApps.find((a) => a.slug === slug);
    if (!app) throw new NotFoundException(`Player app "${slug}" not found`);
    return app;
  }

  private binaryFilename(app: PlayerAppDefinition): string {
    return `${app.appId}_${app.version}_all.ipk`;
  }

  private binaryExists(app: PlayerAppDefinition): boolean {
    const binPath = path.join(this.appsBasePath, app.slug, 'dist', this.binaryFilename(app));
    return fs.existsSync(binPath);
  }
}
