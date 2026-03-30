import { getOriginalPath, getTranscodedPath } from './content-storage.util';
import * as path from 'path';

describe('content-storage.util', () => {
  const basePath = '/data/media';
  const organisationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const contentId = 'f1e2d3c4-b5a6-7890-abcd-ef1234567890';

  describe('getOriginalPath', () => {
    it('should return the correct path for an original file', () => {
      const result = getOriginalPath(
        basePath,
        organisationId,
        contentId,
        'png',
      );
      expect(result).toBe(
        path.join(basePath, organisationId, 'originals', `${contentId}.png`),
      );
    });

    it('should handle video extensions', () => {
      const result = getOriginalPath(
        basePath,
        organisationId,
        contentId,
        'mp4',
      );
      expect(result).toBe(
        path.join(basePath, organisationId, 'originals', `${contentId}.mp4`),
      );
    });
  });

  describe('getTranscodedPath', () => {
    it('should return the correct path for a transcoded file', () => {
      const result = getTranscodedPath(
        basePath,
        organisationId,
        contentId,
        'webp',
      );
      expect(result).toBe(
        path.join(basePath, organisationId, 'transcoded', `${contentId}.webp`),
      );
    });

    it('should handle mp4 target extension', () => {
      const result = getTranscodedPath(
        basePath,
        organisationId,
        contentId,
        'mp4',
      );
      expect(result).toBe(
        path.join(basePath, organisationId, 'transcoded', `${contentId}.mp4`),
      );
    });
  });
});
