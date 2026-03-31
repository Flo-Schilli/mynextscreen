export interface CropParams {
    w: number;
    h: number;
    x: number;
    y: number;
}
export declare function computeCropParams(sourceWidth: number, sourceHeight: number, gridColumns: number, gridRows: number, gridColumn: number, gridRow: number): CropParams;
export declare function buildCropFilter(params: CropParams): string;
