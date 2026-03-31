"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCropParams = computeCropParams;
exports.buildCropFilter = buildCropFilter;
function computeCropParams(sourceWidth, sourceHeight, gridColumns, gridRows, gridColumn, gridRow) {
    const w = Math.floor(sourceWidth / gridColumns);
    const h = Math.floor(sourceHeight / gridRows);
    const x = gridColumn * w;
    const y = gridRow * h;
    return { w, h, x, y };
}
function buildCropFilter(params) {
    return `crop=${params.w}:${params.h}:${params.x}:${params.y}`;
}
//# sourceMappingURL=crop-computation.util.js.map