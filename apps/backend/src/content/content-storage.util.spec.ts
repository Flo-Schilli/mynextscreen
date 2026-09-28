import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  getOriginalPath,
  getTranscodedPath,
  removeOrganisationMedia,
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
      const base = await mkdtemp(path.join(tmpdir(), 'signage-media-'));
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
      const base = await mkdtemp(path.join(tmpdir(), 'signage-media-'));
      const outsider = path.join(await mkdtemp(path.join(tmpdir(), 'signage-other-')), 'keep.txt');
      await writeFile(outsider, 'keep');

      await removeOrganisationMedia(base, '11111111-1111-1111-1111-111111111111', [
        outsider,
        path.join(base, '..', 'escape.txt'),
      ]);

      expect(existsSync(outsider)).toBe(true);
    });
  });
});
