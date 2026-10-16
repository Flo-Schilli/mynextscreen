import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  getOriginalPath,
  getTranscodedPath,
  removeOrganisationMedia,
  removeStagingFiles,
} from './content-storage.util';
import * as path from 'path';

describe('content-storage.util', () => {
  const basePath = '/data/media';
  const organisationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const contentId = 'f1e2d3c4-b5a6-7890-abcd-ef1234567890';

  describe('getOriginalPath', () => {
    it('should return the correct path for an original file', () => {
      const result = getOriginalPath(basePath, organisationId, contentId, 'png');
      expect(result).toBe(path.join(basePath, organisationId, 'originals', `${contentId}.png`));
    });

    it('should handle video extensions', () => {
      const result = getOriginalPath(basePath, organisationId, contentId, 'mp4');
      expect(result).toBe(path.join(basePath, organisationId, 'originals', `${contentId}.mp4`));
    });
  });

  describe('getTranscodedPath', () => {
    it('should return the correct path for a transcoded file', () => {
      const result = getTranscodedPath(basePath, organisationId, contentId, 'webp');
      expect(result).toBe(path.join(basePath, organisationId, 'transcoded', `${contentId}.webp`));
    });

    it('should handle mp4 target extension', () => {
      const result = getTranscodedPath(basePath, organisationId, contentId, 'mp4');
      expect(result).toBe(path.join(basePath, organisationId, 'transcoded', `${contentId}.mp4`));
    });
  });

  describe('removeOrganisationMedia', () => {
    it('removes the org directory and the legacy slices outside it', async () => {
      const base = await mkdtemp(path.join(tmpdir(), 'mynextscreen-media-'));
      const orgId = '11111111-1111-1111-1111-111111111111';

      await mkdir(path.join(base, orgId, 'originals'), { recursive: true });
      await writeFile(path.join(base, orgId, 'originals', 'a.png'), 'x');
      const legacySlice = path.join(base, 'slices', 'group-1', 'screen-1', 'c.mp4');
      await mkdir(path.dirname(legacySlice), { recursive: true });
      await writeFile(legacySlice, 'x');

      await removeOrganisationMedia(base, orgId, [legacySlice]);

      expect(existsSync(path.join(base, orgId))).toBe(false);
      expect(existsSync(legacySlice)).toBe(false);
    });

    it('ignores a path outside the media root', async () => {
      const base = await mkdtemp(path.join(tmpdir(), 'mynextscreen-media-'));
      const outsider = path.join(
        await mkdtemp(path.join(tmpdir(), 'mynextscreen-other-')),
        'keep.txt',
      );
      await writeFile(outsider, 'keep');

      await removeOrganisationMedia(base, '11111111-1111-1111-1111-111111111111', [
        outsider,
        path.join(base, '..', 'escape.txt'),
      ]);

      expect(existsSync(outsider)).toBe(true);
    });
  });

  describe('removeStagingFiles', () => {
    const orgId = '11111111-1111-1111-1111-111111111111';
    const id = '22222222-2222-2222-2222-222222222222';

    it('removes only the staging files for the content item', async () => {
      const base = await mkdtemp(path.join(tmpdir(), 'mynextscreen-staging-'));
      const transcoded = path.join(base, orgId, 'transcoded');
      await mkdir(transcoded, { recursive: true });
      const staged = path.join(transcoded, `${id}.next-abc.mp4`);
      const stagedThumb = path.join(transcoded, `${id}_thumb.next-abc.webp`);
      const live = path.join(transcoded, `${id}.mp4`);
      const other = path.join(transcoded, `${contentId}.next-xyz.mp4`);
      await Promise.all([staged, stagedThumb, live, other].map((file) => writeFile(file, 'x')));

      await removeStagingFiles(base, orgId, id);

      expect(existsSync(staged)).toBe(false);
      expect(existsSync(stagedThumb)).toBe(false);
      expect(existsSync(live)).toBe(true);
      expect(existsSync(other)).toBe(true);
    });

    it('is a no-op when the transcoded directory is missing', async () => {
      const base = await mkdtemp(path.join(tmpdir(), 'mynextscreen-staging-'));
      await expect(removeStagingFiles(base, orgId, id)).resolves.toBeUndefined();
    });

    it('rejects a non-UUID organisationId before touching the filesystem', async () => {
      await expect(removeStagingFiles('/data/media', '../../etc', id)).rejects.toThrow(
        /Invalid organisationId/,
      );
    });

    it('rejects a non-UUID contentId before touching the filesystem', async () => {
      await expect(removeStagingFiles('/data/media', orgId, '../escape')).rejects.toThrow(
        /Invalid contentId/,
      );
    });
  });
});
