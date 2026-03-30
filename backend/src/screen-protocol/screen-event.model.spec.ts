import { ScreenEvent } from './screen-event.model';
import { ScreenEventType } from './screen-event-type.enum';

describe('ScreenEvent', () => {
  it('should construct a schedule_update event', () => {
    const event = new ScreenEvent(ScreenEventType.ScheduleUpdate, {
      scheduleId: '123',
    });

    expect(event.type).toBe(ScreenEventType.ScheduleUpdate);
    expect(event.payload).toEqual({ scheduleId: '123' });
  });

  it('should construct a playlist_update event', () => {
    const event = new ScreenEvent(ScreenEventType.PlaylistUpdate, {
      playlistId: '456',
      items: [],
    });

    expect(event.type).toBe(ScreenEventType.PlaylistUpdate);
    expect(event.payload).toEqual({ playlistId: '456', items: [] });
  });

  it('should construct a content_update event', () => {
    const event = new ScreenEvent(ScreenEventType.ContentUpdate, {
      contentId: '789',
      contentUrl: '/api/media/org1/789.mp4',
    });

    expect(event.type).toBe(ScreenEventType.ContentUpdate);
    expect(event.payload).toEqual({
      contentId: '789',
      contentUrl: '/api/media/org1/789.mp4',
    });
  });

  it('should construct a live_stream_start event', () => {
    const event = new ScreenEvent(ScreenEventType.LiveStreamStart, {
      streamUrl: 'rtmp://example.com/live',
    });

    expect(event.type).toBe(ScreenEventType.LiveStreamStart);
    expect(event.payload).toEqual({
      streamUrl: 'rtmp://example.com/live',
    });
  });

  it('should construct a live_stream_stop event', () => {
    const event = new ScreenEvent(ScreenEventType.LiveStreamStop, {
      reason: 'stream_ended',
    });

    expect(event.type).toBe(ScreenEventType.LiveStreamStop);
    expect(event.payload).toEqual({ reason: 'stream_ended' });
  });

  it('should have correct enum string values', () => {
    expect(ScreenEventType.ScheduleUpdate).toBe('schedule_update');
    expect(ScreenEventType.PlaylistUpdate).toBe('playlist_update');
    expect(ScreenEventType.ContentUpdate).toBe('content_update');
    expect(ScreenEventType.LiveStreamStart).toBe('live_stream_start');
    expect(ScreenEventType.LiveStreamStop).toBe('live_stream_stop');
  });
});
