export interface DateRange {
    start: Date;
    end: Date;
}
export declare function expandRRule(rruleString: string, entryStart: Date, entryEnd: Date, windowStart: Date, windowEnd: Date): DateRange[];
export declare function getOccurrences(entryStart: Date, entryEnd: Date, rruleString: string | null, windowStart: Date, windowEnd: Date): DateRange[];
