import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, take, toArray } from 'rxjs';
import { SiteAgentSseService } from './site-agent-sse.service';
import { SiteAgentCommandType } from './site-agent-command.enum';

describe('SiteAgentSseService', () => {
  let service: SiteAgentSseService;

  const agentId = '660e8400-e29b-41d4-a716-446655440000';
  const otherAgentId = '770e8400-e29b-41d4-a716-446655440000';

  const command = {
    commandId: 'cmd-1',
    type: SiteAgentCommandType.Launch,
    screenId: '880e8400-e29b-41d4-a716-446655440000',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SiteAgentSseService],
    }).compile();
    service = module.get(SiteAgentSseService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('push', () => {
    it('reports failure for an agent that is not connected', () => {
      expect(service.push(agentId, command)).toBe(false);
    });

    it('delivers a command to the connected agent', async () => {
      const received = firstValueFrom(service.subscribe(agentId).pipe(take(1)));

      expect(service.push(agentId, command)).toBe(true);

      expect(await received).toEqual({ data: command, type: 'command' });
    });

    // Two venues on one server must not see each other's instructions.
    it('does not deliver to a different agent', async () => {
      const mine = firstValueFrom(service.subscribe(agentId).pipe(take(1)));
      const theirs = service.subscribe(otherAgentId).pipe(take(1), toArray());
      const theirsSettled = firstValueFrom(theirs);

      service.push(agentId, command);

      expect((await mine).data).toEqual(command);
      service.push(otherAgentId, { ...command, commandId: 'cmd-2' });
      expect((await theirsSettled)[0].data).toMatchObject({ commandId: 'cmd-2' });
    });
  });

  describe('isConnected', () => {
    it('is false before anyone subscribes', () => {
      expect(service.isConnected(agentId)).toBe(false);
    });

    it('is true while a stream is open', () => {
      const sub = service.subscribe(agentId).subscribe();

      expect(service.isConnected(agentId)).toBe(true);

      sub.unsubscribe();
    });

    it('is false again once the stream closes', () => {
      const sub = service.subscribe(agentId).subscribe();

      sub.unsubscribe();

      expect(service.isConnected(agentId)).toBe(false);
    });

    // An agent that reconnects before the old stream finalises must not have
    // the stale teardown drop the live connection.
    it('stays connected while a second subscriber is still attached', () => {
      const first = service.subscribe(agentId).subscribe();
      const second = service.subscribe(agentId).subscribe();

      first.unsubscribe();

      expect(service.isConnected(agentId)).toBe(true);
      second.unsubscribe();
      expect(service.isConnected(agentId)).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('drops every connection', () => {
      service.subscribe(agentId).subscribe();
      service.subscribe(otherAgentId).subscribe();

      service.onModuleDestroy();

      expect(service.isConnected(agentId)).toBe(false);
      expect(service.isConnected(otherAgentId)).toBe(false);
    });
  });

  describe('keepalive', () => {
    it('emits a keepalive on the interval so proxies do not time the stream out', async () => {
      jest.useFakeTimers();
      try {
        const received = firstValueFrom(service.subscribe(agentId).pipe(take(1)));
        jest.advanceTimersByTime(30_000);

        expect(await received).toEqual({ data: '', type: 'keepalive' });
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
