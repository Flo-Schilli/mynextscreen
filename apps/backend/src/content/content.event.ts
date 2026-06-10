export const CONTENT_DURATION_RESOLVED = 'content.duration_resolved';

export class ContentDurationResolvedEvent {
  constructor(
    public readonly contentId: string,
    public readonly durationSeconds: number,
  ) {}
}
