export declare const TRANSCODING_COMPLETED = "transcoding.completed";
export declare const TRANSCODING_FAILED = "transcoding.failed";
export declare const TRANSCODING_PROGRESS = "transcoding.progress";
export declare class TranscodingCompletedEvent {
    readonly contentId: string;
    readonly organisationId: string;
    readonly transcodedSizeBytes: number;
    constructor(contentId: string, organisationId: string, transcodedSizeBytes: number);
}
export declare class TranscodingFailedEvent {
    readonly contentId: string;
    readonly organisationId: string;
    readonly error: string;
    constructor(contentId: string, organisationId: string, error: string);
}
export declare class TranscodingProgressEvent {
    readonly contentId: string;
    readonly organisationId: string;
    readonly progress: number;
    constructor(contentId: string, organisationId: string, progress: number);
}
