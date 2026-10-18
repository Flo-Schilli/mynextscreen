import {
  HlsUploadService,
  PLAYLIST_NAME,
  UPLOAD_ATTEMPTS,
  UPLOAD_CONCURRENCY,
  parsePlaylistSegments,
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
    const text = `${playlist('seg_00001.ts', 'seg_00002.ts')}\nhttp://evil/x.ts\n../up.ts\nseg 3.ts\n`;

    expect(parsePlaylistSegments(text)).toEqual(['seg_00001.ts', 'seg_00002.ts']);
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
    set('seg_00001.ts', 'a');
    set('seg_00002.ts', 'b');
    set(PLAYLIST_NAME, playlist('seg_00001.ts', 'seg_00002.ts'));

    trigger();
    await idle();

    const playlistAt = events.indexOf(`PUT ${PLAYLIST_NAME}`);
    expect(playlistAt).toBe(2);
    expect(events.slice(0, 2).sort()).toEqual(['PUT seg_00001.ts', 'PUT seg_00002.ts']);
  });

  it('sends the right content types and ids', async () => {
    set('seg_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_00001.ts'));

    trigger();
    await idle();

    expect(target.putHlsFile).toHaveBeenCalledWith(
      STREAM,
      'seg_00001.ts',
      Buffer.from('a'),
      'video/mp2t',
    );
    expect(target.putHlsFile).toHaveBeenCalledWith(
      STREAM,
      PLAYLIST_NAME,
      Buffer.from(playlist('seg_00001.ts')),
      'application/vnd.apple.mpegurl',
    );
  });

  it('uploads only segments it has not sent yet and deletes rolled-off ones after the playlist', async () => {
    set('seg_00001.ts', 'a');
    set('seg_00002.ts', 'b');
    set(PLAYLIST_NAME, playlist('seg_00001.ts', 'seg_00002.ts'));
    trigger();
    await idle();
    events.length = 0;

    set('seg_00003.ts', 'c');
    set(PLAYLIST_NAME, playlist('seg_00002.ts', 'seg_00003.ts'));
    trigger();
    await idle();

    expect(events).toEqual(['PUT seg_00003.ts', `PUT ${PLAYLIST_NAME}`, 'DELETE seg_00001.ts']);
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
    const names = ['seg_00001.ts', 'seg_00002.ts', 'seg_00003.ts', 'seg_00004.ts', 'seg_00005.ts'];
    names.forEach((name) => set(name, 'x'));
    set(PLAYLIST_NAME, playlist(...names));

    trigger();
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(peak).toBe(UPLOAD_CONCURRENCY);
  });

  it('retries a failed upload with backoff', async () => {
    set('seg_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_00001.ts'));
    target.putHlsFile
      .mockRejectedValueOnce(new Error('503'))
      .mockRejectedValueOnce(new Error('503'));

    trigger();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(target.putHlsFile).toHaveBeenCalledWith(
      STREAM,
      'seg_00001.ts',
      expect.anything(),
      'video/mp2t',
    );
    expect(target.putHlsFile).toHaveBeenCalledTimes(4);
    expect(events).toEqual(['PUT seg_00001.ts', `PUT ${PLAYLIST_NAME}`]);
  });

  it('holds the playlist back when a segment cannot be uploaded, and retries later', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      set('seg_00001.ts', 'a');
      set(PLAYLIST_NAME, playlist('seg_00001.ts'));
      target.putHlsFile.mockImplementation(async (_id, name) => {
        if (name === 'seg_00001.ts') {
          throw new Error('down');
        }
        events.push(`PUT ${name}`);
      });

      trigger();
      await jest.advanceTimersByTimeAsync(50);

      expect(events).toEqual([]);
      expect(
        target.putHlsFile.mock.calls.filter(([, name]) => name === 'seg_00001.ts'),
      ).toHaveLength(UPLOAD_ATTEMPTS);

      target.putHlsFile.mockImplementation(async (_id, name) => {
        events.push(`PUT ${name}`);
      });
      await jest.advanceTimersByTimeAsync(1_500);

      expect(events).toEqual(['PUT seg_00001.ts', `PUT ${PLAYLIST_NAME}`]);
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
    set(PLAYLIST_NAME, playlist('seg_00001.ts'));

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
    set('seg_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_00001.ts'));
    trigger();
    await idle();
    target.deleteHlsFile.mockRejectedValue(new Error('404'));

    set('seg_00002.ts', 'b');
    set(PLAYLIST_NAME, playlist('seg_00002.ts'));
    trigger();
    await idle();

    expect(events).toContain('PUT seg_00002.ts');
    expect(target.deleteHlsFile).toHaveBeenCalledWith(STREAM, 'seg_00001.ts');
  });

  it('reruns a pass when files change during it', async () => {
    set('seg_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_00001.ts'));
    target.putHlsFile.mockImplementationOnce(async () => {
      set('seg_00002.ts', 'b');
      set(PLAYLIST_NAME, playlist('seg_00001.ts', 'seg_00002.ts'));
      trigger();
    });

    trigger();
    await idle();

    expect(events).toContain('PUT seg_00002.ts');
  });

  it('measures the lag from detection to acceptance', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      set('seg_00001.ts', 'a');
      set(PLAYLIST_NAME, playlist('seg_00001.ts'));
      target.putHlsFile.mockImplementation(async (_id, name) => {
        if (name === 'seg_00001.ts') {
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
    set('seg_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_00001.ts'));

    trigger();
    await idle();

    expect(watcherClose).toHaveBeenCalled();
    expect(target.putHlsFile).not.toHaveBeenCalled();
  });

  it('stops retrying once stopped', async () => {
    set('seg_00001.ts', 'a');
    set(PLAYLIST_NAME, playlist('seg_00001.ts'));
    target.putHlsFile.mockRejectedValue(new Error('down'));

    trigger();
    await idle();
    await handle.stop();
    const calls = target.putHlsFile.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(target.putHlsFile.mock.calls.length).toBe(calls);
  });
});
