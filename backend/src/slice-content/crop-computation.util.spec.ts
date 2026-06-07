import {
  computeCropParams,
  buildCropFilter,
  CropParams,
} from './crop-computation.util';

describe('computeCropParams', () => {
  describe('2x2 grid', () => {
    const gridColumns = 2;
    const gridRows = 2;
    const sourceWidth = 1920;
    const sourceHeight = 1080;

    it('should compute top-left cell (0,0)', () => {
      const result = computeCropParams(
        sourceWidth,
        sourceHeight,
        gridColumns,
        gridRows,
        0,
        0,
      );
      expect(result).toEqual({ w: 960, h: 540, x: 0, y: 0 });
    });

    it('should compute top-right cell (1,0)', () => {
      const result = computeCropParams(
        sourceWidth,
        sourceHeight,
        gridColumns,
        gridRows,
        1,
        0,
      );
      expect(result).toEqual({ w: 960, h: 540, x: 960, y: 0 });
    });

    it('should compute bottom-left cell (0,1)', () => {
      const result = computeCropParams(
        sourceWidth,
        sourceHeight,
        gridColumns,
        gridRows,
        0,
        1,
      );
      expect(result).toEqual({ w: 960, h: 540, x: 0, y: 540 });
    });

    it('should compute bottom-right cell (1,1)', () => {
      const result = computeCropParams(
        sourceWidth,
        sourceHeight,
        gridColumns,
        gridRows,
        1,
        1,
      );
      expect(result).toEqual({ w: 960, h: 540, x: 960, y: 540 });
    });
  });

  describe('3x1 grid (horizontal strip)', () => {
    const gridColumns = 3;
    const gridRows = 1;
    const sourceWidth = 1920;
    const sourceHeight = 1080;

    it('should compute left cell (0,0)', () => {
      const result = computeCropParams(
        sourceWidth,
        sourceHeight,
        gridColumns,
        gridRows,
        0,
        0,
      );
      expect(result).toEqual({ w: 640, h: 1080, x: 0, y: 0 });
    });

    it('should compute center cell (1,0)', () => {
      const result = computeCropParams(
        sourceWidth,
        sourceHeight,
        gridColumns,
        gridRows,
        1,
        0,
      );
      expect(result).toEqual({ w: 640, h: 1080, x: 640, y: 0 });
    });

    it('should compute right cell (2,0)', () => {
      const result = computeCropParams(
        sourceWidth,
        sourceHeight,
        gridColumns,
        gridRows,
        2,
        0,
      );
      expect(result).toEqual({ w: 640, h: 1080, x: 1280, y: 0 });
    });
  });

  describe('1x3 grid (vertical strip)', () => {
    const gridColumns = 1;
    const gridRows = 3;
    const sourceWidth = 1920;
    const sourceHeight = 1080;

    it('should compute top cell (0,0)', () => {
      const result = computeCropParams(
        sourceWidth,
        sourceHeight,
        gridColumns,
        gridRows,
        0,
        0,
      );
      expect(result).toEqual({ w: 1920, h: 360, x: 0, y: 0 });
    });

    it('should compute middle cell (0,1)', () => {
      const result = computeCropParams(
        sourceWidth,
        sourceHeight,
        gridColumns,
        gridRows,
        0,
        1,
      );
      expect(result).toEqual({ w: 1920, h: 360, x: 0, y: 360 });
    });

    it('should compute bottom cell (0,2)', () => {
      const result = computeCropParams(
        sourceWidth,
        sourceHeight,
        gridColumns,
        gridRows,
        0,
        2,
      );
      expect(result).toEqual({ w: 1920, h: 360, x: 0, y: 720 });
    });
  });

  describe('non-square content resolutions', () => {
    it('should handle 4K resolution on 2x2 grid', () => {
      const result = computeCropParams(3840, 2160, 2, 2, 1, 1);
      expect(result).toEqual({ w: 1920, h: 1080, x: 1920, y: 1080 });
    });

    it('should handle portrait resolution (1080x1920) on 2x2 grid', () => {
      const result = computeCropParams(1080, 1920, 2, 2, 0, 1);
      expect(result).toEqual({ w: 540, h: 960, x: 0, y: 960 });
    });

    it('should handle non-standard resolution (1366x768) on 2x2 grid', () => {
      const result = computeCropParams(1366, 768, 2, 2, 0, 0);
      expect(result).toEqual({ w: 683, h: 384, x: 0, y: 0 });
    });
  });

  describe('odd pixel dimensions (floor rounding)', () => {
    it('should floor the width when not evenly divisible', () => {
      // 1921 / 2 = 960.5 -> floor to 960
      const result = computeCropParams(1921, 1080, 2, 1, 0, 0);
      expect(result).toEqual({ w: 960, h: 1080, x: 0, y: 0 });
    });

    it('should floor the height when not evenly divisible', () => {
      // 1080 / 3 = 360, 1081 / 3 = 360.33 -> floor to 360
      const result = computeCropParams(1920, 1081, 2, 3, 1, 2);
      expect(result).toEqual({ w: 960, h: 360, x: 960, y: 720 });
    });

    it('should handle prime number dimensions', () => {
      // 1279 / 2 = 639.5 -> 639, 719 / 3 = 239.67 -> 239
      const result = computeCropParams(1279, 719, 2, 3, 1, 2);
      expect(result).toEqual({ w: 639, h: 239, x: 639, y: 478 });
    });
  });
});

describe('buildCropFilter', () => {
  it('should format crop filter string correctly', () => {
    const params: CropParams = { w: 960, h: 540, x: 960, y: 540 };
    expect(buildCropFilter(params)).toBe('crop=960:540:960:540');
  });

  it('should handle zero offsets', () => {
    const params: CropParams = { w: 1920, h: 1080, x: 0, y: 0 };
    expect(buildCropFilter(params)).toBe('crop=1920:1080:0:0');
  });
});
