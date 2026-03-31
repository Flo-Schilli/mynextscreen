"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandRRule = expandRRule;
exports.getOccurrences = getOccurrences;
const rrule_1 = require("rrule");
function expandRRule(rruleString, entryStart, entryEnd, windowStart, windowEnd) {
    const durationMs = entryEnd.getTime() - entryStart.getTime();
    const rule = (0, rrule_1.rrulestr)(rruleString, { dtstart: entryStart });
    const occurrences = rule.between(windowStart, windowEnd, true);
    return occurrences.map((occStart) => ({
        start: occStart,
        end: new Date(occStart.getTime() + durationMs),
    }));
}
function getOccurrences(entryStart, entryEnd, rruleString, windowStart, windowEnd) {
    if (!rruleString) {
        if (entryStart < windowEnd && entryEnd > windowStart) {
            return [{ start: entryStart, end: entryEnd }];
        }
        return [];
    }
    return expandRRule(rruleString, entryStart, entryEnd, windowStart, windowEnd);
}
//# sourceMappingURL=rrule.util.js.map