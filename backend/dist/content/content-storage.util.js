"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOriginalPath = getOriginalPath;
exports.getTranscodedPath = getTranscodedPath;
const path = require("path");
function getOriginalPath(basePath, organisationId, contentId, ext) {
    return path.join(basePath, organisationId, 'originals', `${contentId}.${ext}`);
}
function getTranscodedPath(basePath, organisationId, contentId, targetExt) {
    return path.join(basePath, organisationId, 'transcoded', `${contentId}.${targetExt}`);
}
//# sourceMappingURL=content-storage.util.js.map