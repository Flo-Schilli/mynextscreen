"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscodingProgressEvent = exports.TranscodingFailedEvent = exports.TranscodingCompletedEvent = exports.TRANSCODING_PROGRESS = exports.TRANSCODING_FAILED = exports.TRANSCODING_COMPLETED = void 0;
exports.TRANSCODING_COMPLETED = 'transcoding.completed';
exports.TRANSCODING_FAILED = 'transcoding.failed';
exports.TRANSCODING_PROGRESS = 'transcoding.progress';
class TranscodingCompletedEvent {
    contentId;
    organisationId;
    transcodedSizeBytes;
    constructor(contentId, organisationId, transcodedSizeBytes) {
        this.contentId = contentId;
        this.organisationId = organisationId;
        this.transcodedSizeBytes = transcodedSizeBytes;
    }
}
exports.TranscodingCompletedEvent = TranscodingCompletedEvent;
class TranscodingFailedEvent {
    contentId;
    organisationId;
    error;
    constructor(contentId, organisationId, error) {
        this.contentId = contentId;
        this.organisationId = organisationId;
        this.error = error;
    }
}
exports.TranscodingFailedEvent = TranscodingFailedEvent;
class TranscodingProgressEvent {
    contentId;
    organisationId;
    progress;
    constructor(contentId, organisationId, progress) {
        this.contentId = contentId;
        this.organisationId = organisationId;
        this.progress = progress;
    }
}
exports.TranscodingProgressEvent = TranscodingProgressEvent;
//# sourceMappingURL=transcoding.event.js.map