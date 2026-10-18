import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { NdiHlsStorageService, DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES } from './ndi-hls-storage.service';
import type { FfmpegLiveService } from './ffmpeg-live.service';
import type { ConfigService } from '@nestjs/config';

describe('NdiHlsStorageService', () => {
  const streamId = '660e8400-e29b-41d4-a716-446655440000';
  let root: string;
  let configValue: unknown;
  let service: NdiHlsStorageService;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'ndi-hls-'));
    configValue = undefined;
    const ffmpeg = {
      getHlsOutputDir: (id: string) => path.join(root, id),
    } as unknown as FfmpegLiveService;
    const config = {
      get: (_key: string, fallback: unknown) => configValue ?? fallback,
    } as unknown as ConfigService;
    service = new NdiHlsStorageService(ffmpeg, config);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('maxUploadBytes', () => {
    it('defaults to 8 MiB', () => {
      expect(service.maxUploadBytes).toBe(DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES);
    });

    it('reads the configured value, also as a string', () => {
      configValue = '1024';
      expect(service.maxUploadBytes).toBe(1024);
    });

    it.each(['abc', '0', '-5'])('falls back to the default for %s', (value) => {
      configValue = value;
      expect(service.maxUploadBytes).toBe(DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES);
    });
  });

  describe('write', () => {
    it('writes a segment and a playlist into the stream directory', async () => {
      await service.write(streamId, 'seg_1.ts', Buffer.from('ts'));
      await service.write(streamId, 'index.m3u8', Buffer.from('#EXTM3U'));

      const dir = path.join(root, streamId);
      expect(fs.readFileSync(path.join(dir, 'seg_1.ts'), 'utf8')).toBe('ts');
      expect(fs.readFileSync(path.join(dir, 'index.m3u8'), 'utf8')).toBe('#EXTM3U');
    });

    it('replaces a playlist atomically and leaves no temp file behind', async () => {
      await service.write(streamId, 'index.m3u8', Buffer.from('one'));
      await service.write(streamId, 'index.m3u8', Buffer.from('two'));

      const dir = path.join(root, streamId);
      expect(fs.readdirSync(dir)).toEqual(['index.m3u8']);
      expect(fs.readFileSync(path.join(dir, 'index.m3u8'), 'utf8')).toBe('two');
    });

    it('rejects a body above the size cap with 413', async () => {
      configValue = 4;

      await expect(service.write(streamId, 'seg_1.ts', Buffer.alloc(5))).rejects.toThrow(
        PayloadTooLargeException,
      );
      expect(fs.existsSync(path.join(root, streamId))).toBe(false);
    });

    it('accepts a body exactly at the cap', async () => {
      configValue = 4;

      await expect(service.write(streamId, 'seg_1.ts', Buffer.alloc(4))).resolves.toBeUndefined();
    });

    it.each([
      '../evil.ts',
      '..%2Fevil.ts',
      'sub/seg.ts',
      '/etc/passwd',
      'seg.mp4',
      'index.m3u8.ts.exe',
      '.hidden.ts',
      'a b.ts',
      '',
      '..',
    ])('rejects the filename %j', async (filename) => {
      await expect(service.write(streamId, filename, Buffer.from('x'))).rejects.toThrow(
        BadRequestException,
      );
      expect(fs.existsSync(path.join(root, streamId))).toBe(false);
    });

    it('rejects a stream id that is not a UUID, so it cannot leave the output directory', async () => {
      await expect(service.write('../..', 'seg_1.ts', Buffer.from('x'))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('removes the temp file and rethrows when the rename fails', async () => {
      const dir = path.join(root, streamId);
      fs.mkdirSync(path.join(dir, 'seg_1.ts'), { recursive: true });

      await expect(service.write(streamId, 'seg_1.ts', Buffer.from('x'))).rejects.toThrow();
      expect(fs.readdirSync(dir)).toEqual(['seg_1.ts']);
    });
  });

  describe('remove', () => {
    it('deletes a file and tolerates one that is already gone', async () => {
      await service.write(streamId, 'seg_1.ts', Buffer.from('x'));

      await service.remove(streamId, 'seg_1.ts');
      await expect(service.remove(streamId, 'seg_1.ts')).resolves.toBeUndefined();

      expect(fs.existsSync(path.join(root, streamId, 'seg_1.ts'))).toBe(false);
    });

    it('rejects a traversing filename', async () => {
      await expect(service.remove(streamId, '../x.ts')).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeStreamDir', () => {
    it('removes the whole directory', async () => {
      await service.write(streamId, 'seg_1.ts', Buffer.from('x'));

      await service.removeStreamDir(streamId);

      expect(fs.existsSync(path.join(root, streamId))).toBe(false);
    });

    it('does not throw when removal fails', async () => {
      const spy = jest.spyOn(fs.promises, 'rm').mockRejectedValueOnce(new Error('busy'));

      await expect(service.removeStreamDir(streamId)).resolves.toBeUndefined();
      spy.mockRestore();
    });
  });
});
