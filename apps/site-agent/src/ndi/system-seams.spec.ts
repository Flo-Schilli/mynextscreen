import { chmod, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { systemHlsFileSystem } from '../hls/hls-upload.service';
import { systemDeviceProbe } from './ndi-encoder';
import { ensureBaseDir, systemStreamDirectory } from './ndi-stream.manager';

describe('system seams', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mns-seam-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('prepares an empty stream directory and removes it again', async () => {
    const dir = join(root, 'stream');
    await systemStreamDirectory.prepare(dir);
    await writeFile(join(dir, 'old.ts'), 'x');

    await systemStreamDirectory.prepare(dir);

    expect((await stat(dir)).isDirectory()).toBe(true);
    await expect(stat(join(dir, 'old.ts'))).rejects.toThrow();

    await systemStreamDirectory.remove(dir);
    await expect(stat(dir)).rejects.toThrow();
  });

  describe('ensureBaseDir', () => {
    it('creates the base private', async () => {
      const base = join(root, 'base');

      await ensureBaseDir(base);

      expect((await stat(base)).mode & 0o777).toBe(0o700);
    });

    it('tightens a base that is readable by others', async () => {
      const base = join(root, 'loose');
      await mkdir(base, { mode: 0o755 });
      await chmod(base, 0o755);

      await ensureBaseDir(base);

      expect((await stat(base)).mode & 0o777).toBe(0o700);
    });

    it('refuses a symlink, even one that points at a directory', async () => {
      const target = join(root, 'target');
      await mkdir(target);
      const link = join(root, 'link');
      await symlink(target, link);

      await expect(ensureBaseDir(link)).rejects.toThrow('not a plain directory');
    });

    it('refuses a base owned by another user', async () => {
      const base = join(root, 'foreign');
      await mkdir(base);
      const getuid = jest.spyOn(process, 'getuid').mockReturnValue((process.getuid?.() ?? 0) + 1);

      await expect(ensureBaseDir(base)).rejects.toThrow('owned by another user');
      getuid.mockRestore();
    });

    it('is used when preparing a stream directory', async () => {
      const link = join(root, 'linked-base');
      await symlink(root, link);

      await expect(systemStreamDirectory.prepare(join(link, 'stream'))).rejects.toThrow(
        'not a plain directory',
      );
    });
  });

  it('reads files and reports changes in a watched directory', async () => {
    await writeFile(join(root, 'index.m3u8'), 'playlist');
    const changed = new Promise<void>((resolve) => {
      const watcher = systemHlsFileSystem.watch(root, () => {
        watcher.close();
        resolve();
      });
      void writeFile(join(root, 'seg_00001.ts'), 'segment');
    });

    await changed;

    expect((await systemHlsFileSystem.readFile(join(root, 'index.m3u8'))).toString()).toBe(
      'playlist',
    );
    expect(await readFile(join(root, 'seg_00001.ts'), 'utf8')).toBe('segment');
  });

  it('probes devices without throwing', () => {
    expect(systemDeviceProbe.exists('/definitely/not/here')).toBe(false);
    expect(typeof systemDeviceProbe.hasVideoDevices()).toBe('boolean');
  });
});
