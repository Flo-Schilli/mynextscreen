export const TRANSCODING_COMPLETED = 'transcoding.completed';
export const TRANSCODING_FAILED = 'transcoding.failed';
export const TRANSCODING_PROGRESS = 'transcoding.progress';

export class TranscodingCompletedEvent {
  constructor(
    public readonly contentId: string,
    public readonly organisationId: string,
    public readonly transcodedSizeBytes: number,
  ) {}
}

export class TranscodingFailedEvent {
  constructor(
    public readonly contentId: string,
    public readonly organisationId: string,
    public readonly error: string,
  ) {}
}

export class TranscodingProgressEvent {
  constructor(
    public readonly contentId: string,
    public readonly organisationId: string,
    public readonly progress: number,
  ) {}
}
