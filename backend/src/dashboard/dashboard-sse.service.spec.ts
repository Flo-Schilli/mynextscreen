import {
  DashboardSseService,
  DashboardEventPayload,
} from './dashboard-sse.service';
import {
  TranscodingProgressEvent,
  TranscodingCompletedEvent,
  TranscodingFailedEvent,
} from '../content/transcoding.event';
import { ScreenStatusEvent } from '../screen/screen-status.event';
import { ScheduleEntryChangedEvent } from '../schedule/schedule.event';
import { LiveStreamHealthChangedEvent } from '../live-stream/stream-health.event';
import { firstValueFrom, take } from 'rxjs';

describe('DashboardSseService', () => {
  let service: DashboardSseService;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = 'user-123';

  beforeEach(() => {
    service = new DashboardSseService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('subscribe', () => {
    it('should return an Observable that emits events', async () => {
      const obs$ = service.subscribe(orgId, userId);
      const resultPromise = firstValueFrom(obs$.pipe(take(1)));

      service.pushToOrg(orgId, {
        type: 'test',
        data: { foo: 'bar' },
        timestamp: new Date().toISOString(),
      });

      const result = await resultPromise;
      expect(result.type).toBe('state-change');
      expect(result.data).toEqual(
        expect.objectContaining({ type: 'test', data: { foo: 'bar' } }),
      );
    });

    it('should create unique connections for multiple subscribers', async () => {
      const obs1$ = service.subscribe(orgId, userId);
      const obs2$ = service.subscribe(orgId, 'user-456');

      const result1Promise = firstValueFrom(obs1$.pipe(take(1)));
      const result2Promise = firstValueFrom(obs2$.pipe(take(1)));

      service.pushToOrg(orgId, {
        type: 'broadcast',
        data: {},
        timestamp: new Date().toISOString(),
      });

      const [result1, result2] = await Promise.all([
        result1Promise,
        result2Promise,
      ]);
      expect(result1.type).toBe('state-change');
      expect(result2.type).toBe('state-change');
    });

    it('should clean up connection on unsubscribe', async () => {
      const obs$ = service.subscribe(orgId, userId);
      const sub = obs$.subscribe();

      sub.unsubscribe();

      // After unsubscribe, pushing should not throw
      service.pushToOrg(orgId, {
        type: 'test',
        data: {},
        timestamp: new Date().toISOString(),
      });
    });
  });

  describe('pushToOrg', () => {
    it('should send events to all connections for the given org', async () => {
      const obs1$ = service.subscribe(orgId, 'user-1');
      const obs2$ = service.subscribe(orgId, 'user-2');
      const obs3$ = service.subscribe('other-org', 'user-3');

      const result1Promise = firstValueFrom(obs1$.pipe(take(1)));
      const result2Promise = firstValueFrom(obs2$.pipe(take(1)));

      const payload: DashboardEventPayload = {
        type: 'test',
        data: { value: 42 },
        timestamp: new Date().toISOString(),
      };
      service.pushToOrg(orgId, payload);

      const [result1, result2] = await Promise.all([
        result1Promise,
        result2Promise,
      ]);
      expect((result1.data as DashboardEventPayload).type).toBe('test');
      expect((result2.data as DashboardEventPayload).type).toBe('test');

      // obs3 should not have received the event — verify by pushing to other-org
      const result3Promise = firstValueFrom(obs3$.pipe(take(1)));
      service.pushToOrg('other-org', {
        type: 'other',
        data: {},
        timestamp: new Date().toISOString(),
      });
      const result3 = await result3Promise;
      expect((result3.data as DashboardEventPayload).type).toBe('other');
    });
  });

  describe('pushToUser', () => {
    it('should send events to all connections for the given user', async () => {
      const obs1$ = service.subscribe(orgId, userId);
      const obs2$ = service.subscribe('other-org', userId);
      const obs3$ = service.subscribe(orgId, 'other-user');

      const result1Promise = firstValueFrom(obs1$.pipe(take(1)));
      const result2Promise = firstValueFrom(obs2$.pipe(take(1)));

      const payload: DashboardEventPayload = {
        type: 'notification',
        data: { msg: 'hello' },
        timestamp: new Date().toISOString(),
      };
      service.pushToUser(userId, payload);

      const [result1, result2] = await Promise.all([
        result1Promise,
        result2Promise,
      ]);
      expect((result1.data as DashboardEventPayload).type).toBe('notification');
      expect((result2.data as DashboardEventPayload).type).toBe('notification');

      // obs3 should not receive the user-targeted event
      const result3Promise = firstValueFrom(obs3$.pipe(take(1)));
      service.pushToUser('other-user', {
        type: 'other',
        data: {},
        timestamp: new Date().toISOString(),
      });
      const result3 = await result3Promise;
      expect((result3.data as DashboardEventPayload).type).toBe('other');
    });
  });

  describe('emitToUser', () => {
    it('should wrap data in DashboardEventPayload and push to user', async () => {
      const obs$ = service.subscribe(orgId, userId);
      const resultPromise = firstValueFrom(obs$.pipe(take(1)));

      service.emitToUser(userId, 'notification.new', {
        id: 'notif-1',
        title: 'Test',
      });

      const result = await resultPromise;
      const payload = result.data as DashboardEventPayload;
      expect(payload.type).toBe('notification.new');
      expect(payload.data).toEqual({ id: 'notif-1', title: 'Test' });
      expect(() => new Date(payload.timestamp).toISOString()).not.toThrow();
    });
  });

  describe('event routing', () => {
    function expectOrgEvent(
      handler: () => void,
      expectedType: string,
      dataMatcher: Record<string, unknown>,
    ): Promise<void> {
      return new Promise<void>((resolve) => {
        const obs$ = service.subscribe(orgId, userId);
        const sub = obs$.pipe(take(1)).subscribe((msg) => {
          const payload = msg.data as DashboardEventPayload;
          expect(msg.type).toBe('state-change');
          expect(payload.type).toBe(expectedType);
          expect(payload.data).toEqual(expect.objectContaining(dataMatcher));
          expect(() => new Date(payload.timestamp).toISOString()).not.toThrow();
          sub.unsubscribe();
          resolve();
        });

        handler();
      });
    }

    it('should emit screen.online on screen status change (online)', () => {
      const event = new ScreenStatusEvent('screen-1', orgId, true);
      return expectOrgEvent(
        () => service.handleScreenStatusChanged(event),
        'screen.online',
        { screenId: 'screen-1' },
      );
    });

    it('should emit screen.offline on screen status change (offline)', () => {
      const event = new ScreenStatusEvent('screen-1', orgId, false);
      return expectOrgEvent(
        () => service.handleScreenStatusChanged(event),
        'screen.offline',
        { screenId: 'screen-1' },
      );
    });

    it('should emit transcoding.progress', () => {
      const event = new TranscodingProgressEvent('content-1', orgId, 50);
      return expectOrgEvent(
        () => service.handleTranscodingProgress(event),
        'transcoding.progress',
        { contentId: 'content-1', progress: 50 },
      );
    });

    it('should emit transcoding.complete', () => {
      const event = new TranscodingCompletedEvent('content-1', orgId, 1024);
      return expectOrgEvent(
        () => service.handleTranscodingCompleted(event),
        'transcoding.complete',
        { contentId: 'content-1', transcodedSizeBytes: 1024 },
      );
    });

    it('should emit transcoding.failed', () => {
      const event = new TranscodingFailedEvent(
        'content-1',
        orgId,
        'codec error',
      );
      return expectOrgEvent(
        () => service.handleTranscodingFailed(event),
        'transcoding.failed',
        { contentId: 'content-1', error: 'codec error' },
      );
    });

    it('should emit schedule.updated', () => {
      const event = new ScheduleEntryChangedEvent('screen-1', orgId);
      return expectOrgEvent(
        () => service.handleScheduleChanged(event),
        'schedule.updated',
        { screenId: 'screen-1' },
      );
    });

    it('should emit live-stream-health', () => {
      const event = new LiveStreamHealthChangedEvent(
        'stream-1',
        'Main Camera',
        orgId,
        'degraded',
        '2026-03-31T09:00:00.000Z',
      );
      return expectOrgEvent(
        () => service.handleLiveStreamHealthChanged(event),
        'live-stream-health',
        {
          streamId: 'stream-1',
          streamName: 'Main Camera',
          health: 'degraded',
          checkedAt: '2026-03-31T09:00:00.000Z',
        },
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should complete all connections', () => {
      const obs$ = service.subscribe(orgId, userId);
      const completeSpy = jest.fn();
      obs$.subscribe({ complete: completeSpy });

      service.onModuleDestroy();

      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
