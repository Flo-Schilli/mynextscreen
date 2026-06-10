export const LIVE_STREAM_HEALTH_CHANGED = 'live-stream.health-changed';

export type StreamHealthStatus = 'healthy' | 'degraded' | 'stopped';

export class LiveStreamHealthChangedEvent {
  constructor(
    public readonly streamId: string,
    public readonly streamName: string,
    public readonly organisationId: string,
    public readonly health: StreamHealthStatus,
    public readonly checkedAt: string,
  ) {}
}
