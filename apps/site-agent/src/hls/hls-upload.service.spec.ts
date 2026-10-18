import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  HlsFileRejectedError,
  HlsUploadService,
  PLAYLIST_MAX_BYTES,
  readRegularFile,
  SEGMENT_MAX_BYTES,
  REWATCH_INTERVAL_MS,
  PLAYLIST_NAME,
  UPLOAD_ATTEMPTS,
  UPLOAD_CONCURRENCY,
  parsePlaylistSegments,
  watchDirectory,
  type HlsFileSystem,
  type HlsUploadHandle,
  type HlsUploadTarget,
} from './hls-upload.service';

const STREAM = '6f1c2a52-7d3e-4c1a-9f0e-2b8d5a1c9e11';
const DIR = '/work/stream';

const playlist = (...segments: string[]): string =>
  ['#EXTM3U', '#EXT-X-VERSION:6', ...segments.flatMap((s) => ['#EXTINF:1.000000,', s])].join('\n');

const idle = async (): Promise<void> => {
  for (let i = 0; i < 30; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

describe('parsePlaylistSegments', () => {
  it('lists segments in order and ignores everything else', () => {
    const text = `${playlist('seg_ab12_00001.ts', 'seg_ab12_00002.ts')}\nhttp://evil/x.ts\n../up.ts\nseg 3.ts\n`;

    expect(parsePlaylistSegments(text)).toEqual(['seg_ab12_00001.ts', 'seg_ab12_00002.ts']);
  });
});

describe('HlsUploadService', () => {
  let files: Map<string, string>;
  let trigger: () => void;
  let watcherClose: jest.Mock;
  let events: string[];
  let target: { putHlsFile: jest.Mock; deleteHlsFile: jest.Mock };
  let fileSystem: HlsFileSystem;
  let handle: HlsUploadHandle;

  const set = (name: string, content: string): void => {
    files.set(`${DIR}/${name}`, content);
  };

  beforeEach(() => {
    files = new Map();
    events = [];
    watcherClose = jest.fn();
    fileSystem = {
      watch: (_dir, listener) => {
        trigger = listener;
        return { close: watcherClose };
      },
      readFile: async (path) => {
        const content = files.get(path);
        if (content === undefined) {
          throw new Error('ENOENT');
        }
        return Buffer.from(content);
      },
    };
    target = {
      putHlsFile: jest.fn(async (_id, name) => {
        events.push(`PUT ${name}`);
      }),
      deleteHlsFile: jest.fn(async (_id, name) => {
        events.push(`DELETE ${name}`);
      }),
    };
    handle = new HlsUploadService(target as HlsUploadTarget, fileSystem, 1).start(STREAM, DIR);
  });

  afterEach(async () => {
    await handle.stop();
  });

  it('uploads each new segment before the playlist', async () => {
    set('seg_ab12_00001.ts', 'a');
    set('seg_ab12_00002.ts', 'b');
    set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts', 'seg_ab12_00002.ts'));

    trigger();
    await idle();

    const playlistAt = events.indexOf(`PUT ${PLAYLIST_NAME}`);
    expect(playlistAt).toBe(2);
    expect(events.slice(0, 2).sort()).toEqual(['PUT seg_ab12_00001.ts', 'PUT seg_ab12_00002.ts']);
  });

  it('sends the right content types and ids', async () => {
    set('seg_ab12_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts'));

    trigger();
    await idle();

    expect(target.putHlsFile).toHaveBeenCalledWith(
      STREAM,
      'seg_ab12_00001.ts',
      Buffer.from('a'),
      'video/mp2t',
    );
    expect(target.putHlsFile).toHaveBeenCalledWith(
      STREAM,
      PLAYLIST_NAME,
      Buffer.from(playlist('seg_ab12_00001.ts')),
      'application/vnd.apple.mpegurl',
    );
  });

  it('uploads only segments it has not sent yet and deletes rolled-off ones after the playlist', async () => {
    set('seg_ab12_00001.ts', 'a');
    set('seg_ab12_00002.ts', 'b');
    set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts', 'seg_ab12_00002.ts'));
    trigger();
    await idle();
    events.length = 0;

    set('seg_ab12_00003.ts', 'c');
    set(PLAYLIST_NAME, playlist('seg_ab12_00002.ts', 'seg_ab12_00003.ts'));
    trigger();
    await idle();

    expect(events).toEqual([
      'PUT seg_ab12_00003.ts',
      `PUT ${PLAYLIST_NAME}`,
      'DELETE seg_ab12_00001.ts',
    ]);
  });

  it('limits parallel segment uploads', async () => {
    let inFlight = 0;
    let peak = 0;
    target.putHlsFile.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 3));
      inFlight -= 1;
    });
    const names = [
      'seg_ab12_00001.ts',
      'seg_ab12_00002.ts',
      'seg_ab12_00003.ts',
      'seg_ab12_00004.ts',
      'seg_ab12_00005.ts',
    ];
    names.forEach((name) => set(name, 'x'));
    set(PLAYLIST_NAME, playlist(...names));

    trigger();
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(peak).toBe(UPLOAD_CONCURRENCY);
  });

  it('retries a failed upload with backoff', async () => {
    set('seg_ab12_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts'));
    target.putHlsFile
      .mockRejectedValueOnce(new Error('503'))
      .mockRejectedValueOnce(new Error('503'));

    trigger();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(target.putHlsFile).toHaveBeenCalledWith(
      STREAM,
      'seg_ab12_00001.ts',
      expect.anything(),
      'video/mp2t',
    );
    expect(target.putHlsFile).toHaveBeenCalledTimes(4);
    expect(events).toEqual(['PUT seg_ab12_00001.ts', `PUT ${PLAYLIST_NAME}`]);
  });

  it('holds the playlist back when a segment cannot be uploaded, and retries later', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      set('seg_ab12_00001.ts', 'a');
      set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts'));
      target.putHlsFile.mockImplementation(async (_id, name) => {
        if (name === 'seg_ab12_00001.ts') {
          throw new Error('down');
        }
        events.push(`PUT ${name}`);
      });

      trigger();
      await jest.advanceTimersByTimeAsync(50);

      expect(events).toEqual([]);
      expect(
        target.putHlsFile.mock.calls.filter(([, name]) => name === 'seg_ab12_00001.ts'),
      ).toHaveLength(UPLOAD_ATTEMPTS);

      target.putHlsFile.mockImplementation(async (_id, name) => {
        events.push(`PUT ${name}`);
      });
      await jest.advanceTimersByTimeAsync(1_500);

      expect(events).toEqual(['PUT seg_ab12_00001.ts', `PUT ${PLAYLIST_NAME}`]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('gives up on a playlist upload that keeps failing', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      set(PLAYLIST_NAME, playlist());
      target.putHlsFile.mockRejectedValue(new Error('down'));

      trigger();
      await jest.advanceTimersByTimeAsync(50);

      expect(target.putHlsFile).toHaveBeenCalledTimes(UPLOAD_ATTEMPTS);
    } finally {
      jest.useRealTimers();
    }
  });

  it('skips a segment that is already gone locally', async () => {
    set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts'));

    trigger();
    await idle();

    expect(events).toEqual([`PUT ${PLAYLIST_NAME}`]);
  });

  it('does nothing while the playlist has not been written', async () => {
    trigger();
    await idle();

    expect(target.putHlsFile).not.toHaveBeenCalled();
  });

  it('survives a failing delete', async () => {
    set('seg_ab12_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts'));
    trigger();
    await idle();
    target.deleteHlsFile.mockRejectedValue(new Error('404'));

    set('seg_ab12_00002.ts', 'b');
    set(PLAYLIST_NAME, playlist('seg_ab12_00002.ts'));
    trigger();
    await idle();

    expect(events).toContain('PUT seg_ab12_00002.ts');
    expect(target.deleteHlsFile).toHaveBeenCalledWith(STREAM, 'seg_ab12_00001.ts');
  });

  it('reruns a pass when files change during it', async () => {
    set('seg_ab12_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts'));
    target.putHlsFile.mockImplementationOnce(async () => {
      set('seg_ab12_00002.ts', 'b');
      set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts', 'seg_ab12_00002.ts'));
      trigger();
    });

    trigger();
    await idle();

    expect(events).toContain('PUT seg_ab12_00002.ts');
  });

  it('measures the lag from detection to acceptance', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      set('seg_ab12_00001.ts', 'a');
      set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts'));
      target.putHlsFile.mockImplementation(async (_id, name) => {
        if (name === 'seg_ab12_00001.ts') {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      });
      expect(handle.uploadLagMs()).toBeNull();

      trigger();
      await jest.advanceTimersByTimeAsync(300);

      expect(handle.uploadLagMs()).toBe(250);
    } finally {
      jest.useRealTimers();
    }
  });

  it('closes the watcher and ignores changes after stop', async () => {
    await handle.stop();
    set('seg_ab12_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts'));

    trigger();
    await idle();

    expect(watcherClose).toHaveBeenCalled();
    expect(target.putHlsFile).not.toHaveBeenCalled();
  });

  it('stops retrying once stopped', async () => {
    set('seg_ab12_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_ab12_00001.ts'));
    target.putHlsFile.mockRejectedValue(new Error('down'));

    trigger();
    await idle();
    await handle.stop();
    const calls = target.putHlsFile.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(target.putHlsFile.mock.calls.length).toBe(calls);
  });
});

describe('unchanged playlist', () => {
  it('is not uploaded again', async () => {
    const files = new Map<string, string>([
      [`${DIR}/seg_ab12_00001.ts`, 'a'],
      [`${DIR}/${PLAYLIST_NAME}`, playlist('seg_ab12_00001.ts')],
    ]);
    let trigger: () => void = () => undefined;
    const target = { putHlsFile: jest.fn(async () => undefined), deleteHlsFile: jest.fn() };
    const handle = new HlsUploadService(
      target as HlsUploadTarget,
      {
        watch: (_dir, listener) => {
          trigger = listener;
          return { close: () => undefined };
        },
        readFile: async (path) => Buffer.from(files.get(path) ?? ''),
      },
      1,
    ).start(STREAM, DIR);

    trigger();
    await idle();
    trigger();
    await idle();

    expect(target.putHlsFile).toHaveBeenCalledTimes(2); // segment + playlist, once
    await handle.stop();
  });
});

describe('watchDirectory', () => {
  let base: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'mns-watch-'));
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  it('reports changes in an existing directory', async () => {
    const listener = jest.fn();
    const watcher = watchDirectory(base, listener);

    await writeFile(join(base, 'index.m3u8'), 'x');
    await wait(100);
    watcher.close();

    expect(listener).toHaveBeenCalled();
  });

  it('keeps calling the listener while the directory does not exist yet, and after it appears', async () => {
    const dir = join(base, 'later');
    const listener = jest.fn();
    const watcher = watchDirectory(dir, listener);

    await wait(REWATCH_INTERVAL_MS + 200);
    const whileMissing = listener.mock.calls.length;
    await mkdir(dir);
    await wait(REWATCH_INTERVAL_MS + 200);
    watcher.close();

    expect(whileMissing).toBeGreaterThan(0);
    expect(listener.mock.calls.length).toBeGreaterThan(whileMissing);
  });

  it('stops calling the listener after close', async () => {
    const listener = jest.fn();
    watchDirectory(base, listener).close();

    await wait(REWATCH_INTERVAL_MS + 200);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('segment allowlist', () => {
  it('ignores names that are not seg_<run>_<n>.ts', () => {
    const text = [
      'seg_ab12_00001.ts',
      'seg_ab12.ts',
      'seg__00001.ts',
      'other_ab12_00001.ts',
      'seg_ab-12_00001.ts',
      'seg_ab12_00001.ts.bak',
      '../seg_ab12_00002.ts',
    ].join('\n');

    expect(parsePlaylistSegments(text)).toEqual(['seg_ab12_00001.ts']);
  });
});

describe('a file the shared directory must not hand over', () => {
  it('is skipped without blocking the other segments or the playlist', async () => {
    const files = new Map<string, string>([
      [`${DIR}/seg_ab12_00001.ts`, 'a'],
      [`${DIR}/seg_ab12_00002.ts`, 'b'],
      [`${DIR}/${PLAYLIST_NAME}`, playlist('seg_ab12_00001.ts', 'seg_ab12_00002.ts')],
    ]);
    let trigger: () => void = () => undefined;
    const target = { putHlsFile: jest.fn(async () => undefined), deleteHlsFile: jest.fn() };
    const handle = new HlsUploadService(
      target as HlsUploadTarget,
      {
        watch: (_dir, listener) => {
          trigger = listener;
          return { close: () => undefined };
        },
        readFile: async (path) => {
          if (path.endsWith('seg_ab12_00001.ts')) {
            throw new HlsFileRejectedError('is a symlink');
          }
          return Buffer.from(files.get(path) ?? '');
        },
      },
      1,
    ).start(STREAM, DIR);

    trigger();
    await idle();
    trigger();
    await idle();

    const names = (target.putHlsFile.mock.calls as unknown as string[][]).map((c) => c[1]);
    expect(names).toEqual(['seg_ab12_00002.ts', PLAYLIST_NAME]);
    await handle.stop();
  });
});

describe('readRegularFile', () => {
  let base: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'mns-read-'));
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  it('reads a regular file within the limit', async () => {
    await writeFile(join(base, 'a.ts'), 'abc');

    expect((await readRegularFile(join(base, 'a.ts'), 10)).toString()).toBe('abc');
  });

  it('refuses a symlink, even to a harmless file', async () => {
    await writeFile(join(base, 'target'), 'secret');
    await symlink(join(base, 'target'), join(base, 'link.ts'));

    await expect(readRegularFile(join(base, 'link.ts'), 100)).rejects.toBeInstanceOf(
      HlsFileRejectedError,
    );
  });

  it('refuses a directory', async () => {
    await mkdir(join(base, 'dir.ts'));

    await expect(readRegularFile(join(base, 'dir.ts'), 100)).rejects.toBeInstanceOf(
      HlsFileRejectedError,
    );
  });

  it('refuses a file over the limit', async () => {
    await writeFile(join(base, 'big.ts'), Buffer.alloc(11));

    await expect(readRegularFile(join(base, 'big.ts'), 10)).rejects.toBeInstanceOf(
      HlsFileRejectedError,
    );
  });

  it('reports a missing file as the plain error, not as a rejection', async () => {
    const failure = await readRegularFile(join(base, 'nope.ts'), 10).catch((e: unknown) => e);

    expect(failure).not.toBeInstanceOf(HlsFileRejectedError);
    expect(failure).toMatchObject({ code: 'ENOENT' });
  });

  it('uses 32 MiB for segments and 1 MiB for the playlist', () => {
    expect(SEGMENT_MAX_BYTES).toBe(32 * 1024 * 1024);
    expect(PLAYLIST_MAX_BYTES).toBe(1024 * 1024);
  });
});
