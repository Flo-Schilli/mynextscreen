import { Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { PlayerAppsService } from './player-apps.service';

/**
 * The service resolves everything off the real filesystem, relative to
 * `process.cwd()`. These specs therefore build a throwaway
 * `player-applications/` tree and point the cwd at it, so the IPK filename is
 * matched exactly the way it is in a built image.
 */
/**
 * No PLAYER_APPS_PATH set, so the service falls back to the working directory —
 * which is what these tests arrange.
 */
function config(path?: string): ConfigService {
  return { get: () => path } as unknown as ConfigService;
}

describe('PlayerAppsService', () => {
  const SLUG = 'lg-tvos';
  const APP_ID = 'com.mynextscreen.webos';
  const VERSION = '0.11.0';

  let tmpRoot: string;
  let appDir: string;
  let cwdSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'player-apps-'));
    appDir = path.join(tmpRoot, 'player-applications', SLUG);
    fs.mkdirSync(appDir, { recursive: true });

    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tmpRoot);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    warnSpy.mockRestore();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writeAppInfo(appInfo: Record<string, unknown>): void {
    fs.writeFileSync(path.join(appDir, 'appinfo.json'), JSON.stringify(appInfo));
  }

  function writeGuide(markdown: string): void {
    fs.writeFileSync(path.join(appDir, 'guide.md'), markdown);
  }

  function writeBinary(filename: string): string {
    const distDir = path.join(appDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    const binPath = path.join(distDir, filename);
    fs.writeFileSync(binPath, 'ipk');
    return binPath;
  }

  describe('listApps', () => {
    it('reports the download as available when the packaged IPK matches appinfo.json', () => {
      // Arrange
      writeAppInfo({ id: APP_ID, version: VERSION });
      writeBinary(`${APP_ID}_${VERSION}_all.ipk`);

      // Act
      const apps = new PlayerAppsService(config()).listApps();

      // Assert
      expect(apps).toEqual([{ slug: SLUG, name: 'LG webOS', downloadAvailable: true }]);
    });

    it('reports no download when no IPK was packaged', () => {
      // Arrange
      writeAppInfo({ id: APP_ID, version: VERSION });

      // Act
      const apps = new PlayerAppsService(config()).listApps();

      // Assert
      expect(apps[0].downloadAvailable).toBe(false);
    });

    it('reports no download when the packaged IPK is from an older app id', () => {
      // Arrange — the regression: the project was renamed, the IPK was not.
      writeAppInfo({ id: APP_ID, version: VERSION });
      writeBinary(`com.cbf.webos_${VERSION}_all.ipk`);

      // Act
      const apps = new PlayerAppsService(config()).listApps();

      // Assert
      expect(apps[0].downloadAvailable).toBe(false);
    });

    it('reports no download when appinfo.json is missing', () => {
      // Arrange
      writeBinary(`${APP_ID}_${VERSION}_all.ipk`);

      // Act
      const apps = new PlayerAppsService(config()).listApps();

      // Assert
      expect(apps[0].downloadAvailable).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('reports no download when appinfo.json carries no id', () => {
      // Arrange
      writeAppInfo({ version: VERSION });
      writeBinary(`_${VERSION}_all.ipk`);

      // Act
      const apps = new PlayerAppsService(config()).listApps();

      // Assert
      expect(apps[0].downloadAvailable).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('getBinaryFilename', () => {
    it('derives the filename from appinfo.json rather than a hardcoded id', () => {
      // Arrange
      writeAppInfo({ id: 'com.example.renamed', version: '2.5.0' });

      // Act
      const filename = new PlayerAppsService(config()).getBinaryFilename(SLUG);

      // Assert
      expect(filename).toBe('com.example.renamed_2.5.0_all.ipk');
    });

    it('throws for an unknown slug', () => {
      // Arrange
      writeAppInfo({ id: APP_ID, version: VERSION });
      const service = new PlayerAppsService(config());

      // Act + Assert
      expect(() => service.getBinaryFilename('samsung-tizen')).toThrow(NotFoundException);
    });
  });

  describe('getBinaryPath', () => {
    it('returns the path of the packaged IPK', () => {
      // Arrange
      writeAppInfo({ id: APP_ID, version: VERSION });
      const expected = writeBinary(`${APP_ID}_${VERSION}_all.ipk`);

      // Act
      const binPath = new PlayerAppsService(config()).getBinaryPath(SLUG);

      // Assert
      expect(binPath).toBe(expected);
    });

    it('throws when no IPK was packaged', () => {
      // Arrange
      writeAppInfo({ id: APP_ID, version: VERSION });
      const service = new PlayerAppsService(config());

      // Act + Assert
      expect(() => service.getBinaryPath(SLUG)).toThrow(NotFoundException);
    });
  });

  describe('getGuideHtml', () => {
    it('renders the guide markdown as HTML', async () => {
      // Arrange
      writeAppInfo({ id: APP_ID, version: VERSION });
      writeGuide('# Install\n\nOpen the Developer Mode app.');

      // Act
      const html = await new PlayerAppsService(config()).getGuideHtml(SLUG);

      // Assert
      expect(html).toContain('<h1>Install</h1>');
      expect(html).toContain('Developer Mode');
    });

    it('serves the guide even when appinfo.json is unreadable', async () => {
      // Arrange
      fs.writeFileSync(path.join(appDir, 'appinfo.json'), '{ not json');
      writeGuide('# Install');

      // Act
      const html = await new PlayerAppsService(config()).getGuideHtml(SLUG);

      // Assert
      expect(html).toContain('<h1>Install</h1>');
    });

    it('throws when the guide is missing', async () => {
      // Arrange
      writeAppInfo({ id: APP_ID, version: VERSION });
      const service = new PlayerAppsService(config());

      // Act + Assert
      await expect(service.getGuideHtml(SLUG)).rejects.toThrow(NotFoundException);
    });
  });
});
