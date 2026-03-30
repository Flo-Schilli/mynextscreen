/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { DashboardGateway, DashboardEventPayload } from './dashboard.gateway';
import {
  TranscodingProgressEvent,
  TranscodingCompletedEvent,
  TranscodingFailedEvent,
} from '../content/transcoding.event';
import { ScreenStatusEvent } from '../screen/screen-status.event';
import { ScheduleEntryChangedEvent } from '../schedule/schedule.event';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue('mock-jwks'),
  jwtVerify: jest.fn(),
}));

import { jwtVerify } from 'jose';

const mockedJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

describe('DashboardGateway', () => {
  let gateway: DashboardGateway;
  let emitFn: jest.Mock;
  let toFn: jest.Mock;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue('https://hanko.example.com'),
    };

    gateway = new DashboardGateway(configService as unknown as ConfigService);

    emitFn = jest.fn();
    toFn = jest.fn().mockReturnValue({ emit: emitFn });
    gateway.server = { to: toFn } as any;

    mockedJwtVerify.mockReset();
  });

  describe('handleConnection', () => {
    function makeClient(overrides: Record<string, any> = {}) {
      return {
        handshake: {
          auth: {
            token: 'valid-jwt',
            organisationId: orgId,
            ...overrides.auth,
          },
          query: overrides.query ?? {},
        },
        join: jest.fn(),
        disconnect: jest.fn(),
      };
    }

    it('should authenticate and join org room and user room', async () => {
      mockedJwtVerify.mockResolvedValue({
        payload: { sub: 'user-123' },
        protectedHeader: {},
      } as any);
      const client = makeClient();

      await gateway.handleConnection(client as any);

      expect(mockedJwtVerify).toHaveBeenCalledWith('valid-jwt', 'mock-jwks', {
        issuer: 'https://hanko.example.com',
      });
      expect(client.join).toHaveBeenCalledWith(`org:${orgId}`);
      expect(client.join).toHaveBeenCalledWith('user:user-123');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection when no token provided', async () => {
      const client = makeClient({
        auth: { token: undefined, organisationId: orgId },
      });

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should reject connection when JWT is invalid', async () => {
      mockedJwtVerify.mockRejectedValue(new Error('invalid'));
      const client = makeClient();

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should read token from query if not in auth', async () => {
      mockedJwtVerify.mockResolvedValue({
        payload: { sub: 'user-456' },
        protectedHeader: {},
      } as any);
      const client = makeClient({
        auth: { token: undefined, organisationId: undefined },
        query: { token: 'query-jwt', organisationId: orgId },
      });

      await gateway.handleConnection(client as any);

      expect(mockedJwtVerify).toHaveBeenCalledWith(
        'query-jwt',
        'mock-jwks',
        expect.any(Object),
      );
      expect(client.join).toHaveBeenCalledWith(`org:${orgId}`);
      expect(client.join).toHaveBeenCalledWith('user:user-456');
    });

    it('should not join org room if no organisationId provided but still join user room', async () => {
      mockedJwtVerify.mockResolvedValue({
        payload: { sub: 'user-789' },
        protectedHeader: {},
      } as any);
      const client = makeClient({
        auth: { token: 'valid-jwt', organisationId: undefined },
      });

      await gateway.handleConnection(client as any);

      expect(client.join).toHaveBeenCalledTimes(1);
      expect(client.join).toHaveBeenCalledWith('user:user-789');
    });
  });

  describe('emitToUser', () => {
    it('should emit to user-specific room with DashboardEventPayload', () => {
      gateway.emitToUser('user-123', 'notification.new', {
        id: 'notif-1',
        title: 'Test',
      });

      expect(toFn).toHaveBeenCalledWith('user:user-123');
      expect(emitFn).toHaveBeenCalledWith(
        'notification.new',
        expect.objectContaining({
          type: 'notification.new',
          data: { id: 'notif-1', title: 'Test' },
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('event routing', () => {
    function expectEmittedPayload(
      type: string,
      dataMatcher: Record<string, unknown>,
    ): void {
      expect(toFn).toHaveBeenCalledWith(`org:${orgId}`);
      expect(emitFn).toHaveBeenCalledWith(
        type,
        expect.objectContaining({
          type,
          data: expect.objectContaining(dataMatcher),
          timestamp: expect.any(String),
        }),
      );

      const payload: DashboardEventPayload = emitFn.mock.calls[0][1];
      expect(() => new Date(payload.timestamp).toISOString()).not.toThrow();
    }

    it('should emit screen.online on screen status change (online)', () => {
      const event = new ScreenStatusEvent('screen-1', orgId, true);

      gateway.handleScreenStatusChanged(event);

      expectEmittedPayload('screen.online', { screenId: 'screen-1' });
    });

    it('should emit screen.offline on screen status change (offline)', () => {
      const event = new ScreenStatusEvent('screen-1', orgId, false);

      gateway.handleScreenStatusChanged(event);

      expectEmittedPayload('screen.offline', { screenId: 'screen-1' });
    });

    it('should emit transcoding.progress', () => {
      const event = new TranscodingProgressEvent('content-1', orgId, 50);

      gateway.handleTranscodingProgress(event);

      expectEmittedPayload('transcoding.progress', {
        contentId: 'content-1',
        progress: 50,
      });
    });

    it('should emit transcoding.complete', () => {
      const event = new TranscodingCompletedEvent('content-1', orgId, 1024);

      gateway.handleTranscodingCompleted(event);

      expectEmittedPayload('transcoding.complete', {
        contentId: 'content-1',
        transcodedSizeBytes: 1024,
      });
    });

    it('should emit transcoding.failed', () => {
      const event = new TranscodingFailedEvent(
        'content-1',
        orgId,
        'codec error',
      );

      gateway.handleTranscodingFailed(event);

      expectEmittedPayload('transcoding.failed', {
        contentId: 'content-1',
        error: 'codec error',
      });
    });

    it('should emit schedule.updated', () => {
      const event = new ScheduleEntryChangedEvent('screen-1', orgId);

      gateway.handleScheduleChanged(event);

      expectEmittedPayload('schedule.updated', { screenId: 'screen-1' });
    });
  });
});
