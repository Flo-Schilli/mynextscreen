import { ScreenWallPreviewService } from './screen-wall-preview.service';

describe('ScreenWallPreviewService', () => {
  const service = new ScreenWallPreviewService();

  describe('backgroundSize', () => {
    it('scales the image to span every cell of the grid', () => {
      expect(service.backgroundSize(3, 2)).toBe('300% 200%');
    });

    it('falls back to full size when dimensions are missing', () => {
      expect(service.backgroundSize(null, 2)).toBe('100% 100%');
      expect(service.backgroundSize(3, null)).toBe('100% 100%');
    });
  });

  describe('backgroundPosition', () => {
    it('places the top-left cell at the origin', () => {
      expect(service.backgroundPosition(0, 0, 3, 3)).toBe('0% 0%');
    });

    it('places the bottom-right cell at 100%/100%', () => {
      expect(service.backgroundPosition(2, 2, 3, 3)).toBe('100% 100%');
    });

    it('spreads middle cells evenly across the axis', () => {
      expect(service.backgroundPosition(1, 0, 3, 1)).toBe('50% 0%');
    });

    it('pins a single-column or single-row axis to 0%', () => {
      expect(service.backgroundPosition(0, 0, 1, 1)).toBe('0% 0%');
    });
  });
});
