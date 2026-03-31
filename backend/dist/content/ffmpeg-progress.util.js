"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDuration = parseDuration;
exports.parseProgressTime = parseProgressTime;
exports.calculateProgress = calculateProgress;
const TIME_PATTERN = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/;
const DURATION_PATTERN = /Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/;
function parseTimeToSeconds(hours, minutes, seconds, centiseconds) {
    return (parseInt(hours, 10) * 3600 +
        parseInt(minutes, 10) * 60 +
        parseInt(seconds, 10) +
        parseInt(centiseconds, 10) / 100);
}
function parseDuration(stderrChunk) {
    const match = stderrChunk.match(DURATION_PATTERN);
    if (!match)
        return null;
    return parseTimeToSeconds(match[1], match[2], match[3], match[4]);
}
function parseProgressTime(stderrChunk) {
    const match = stderrChunk.match(TIME_PATTERN);
    if (!match)
        return null;
    return parseTimeToSeconds(match[1], match[2], match[3], match[4]);
}
function calculateProgress(currentTimeSeconds, totalDurationSeconds) {
    if (currentTimeSeconds === null ||
        totalDurationSeconds === null ||
        totalDurationSeconds <= 0) {
        return null;
    }
    const pct = (currentTimeSeconds / totalDurationSeconds) * 100;
    return Math.min(100, Math.round(pct));
}
//# sourceMappingURL=ffmpeg-progress.util.js.map