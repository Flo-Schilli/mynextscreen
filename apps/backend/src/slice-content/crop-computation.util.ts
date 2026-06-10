export interface CropParams {
  w: number;
  h: number;
  x: number;
  y: number;
}

/**
 * Computes FFmpeg crop filter parameters for a given grid cell.
 *
 * Grid coordinates are zero-indexed. Cell (0,0) is top-left.
 * Formula: crop_w = floor(W / C), crop_h = floor(H / R),
 *          x = col * crop_w, y = row * crop_h
 */
export function computeCropParams(
  sourceWidth: number,
  sourceHeight: number,
  gridColumns: number,
  gridRows: number,
  gridColumn: number,
  gridRow: number,
): CropParams {
  const w = Math.floor(sourceWidth / gridColumns);
  const h = Math.floor(sourceHeight / gridRows);
  const x = gridColumn * w;
  const y = gridRow * h;

  return { w, h, x, y };
}

/**
 * Returns the FFmpeg crop filter string: "crop=w:h:x:y"
 */
export function buildCropFilter(params: CropParams): string {
  return `crop=${params.w}:${params.h}:${params.x}:${params.y}`;
}
