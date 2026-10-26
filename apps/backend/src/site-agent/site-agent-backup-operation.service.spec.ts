import { ConflictException } from '@nestjs/common';
import { SiteAgentBackupOperationService } from './site-agent-backup-operation.service';
import { SITE_AGENT_BACKUP_PROGRESS } from './site-agent-backup.event';
import { FakeBackupRedis } from '../test/fake-backup-redis';

const ORG = 'org-1';
const AGENT = 'agent-1';

/** A Drizzle stand-in for the one user lookup the service makes. */
function dbReturning(rows: Array<{ name: string | null; email: string }>) {
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
  };
  return chain;
}

describe('SiteAgentBackupOperationService', () => {
  let redis: FakeBackupRedis;
  let emitter: { emit: jest.Mock };
  let service: SiteAgentBackupOperationService;

  beforeEach(() => {
    redis = new FakeBackupRedis();
    emitter = { emit: jest.fn() };
    service = new SiteAgentBackupOperationService(
      redis as never,
      dbReturning([{ name: 'Flo', email: 'flo@example.test' }]) as never,
      emitter as never,
    );
  });

  function announced(): unknown[] {
    return emitter.emit.mock.calls
      .filter(([name]) => name === SITE_AGENT_BACKUP_PROGRESS)
      .map(([, event]) => (event as { operation: unknown }).operation);
  }

  it('claims the agent, names who started it and announces it', async () => {
    await service.begin(ORG, AGENT, 'import', 'sess-1', 'user-1', 'waiting_for_agent');

    const running = await service.current(AGENT);
    expect(running).toMatchObject({
      kind: 'import',
      id: 'sess-1',
      step: 'waiting_for_agent',
      startedBy: { userId: 'user-1', name: 'Flo' },
    });
    expect(redis.ttls.get(`site-agent-backup:active:${AGENT}`)).toBe(600);
    expect(announced()).toEqual([running]);
  });

  it('falls back to the address when the user has no name', async () => {
    service = new SiteAgentBackupOperationService(
      redis as never,
      dbReturning([{ name: null, email: 'flo@example.test' }]) as never,
      emitter as never,
    );

    await service.begin(ORG, AGENT, 'export', 'cmd-1', 'user-1', 'exporting');

    expect((await service.current(AGENT))?.startedBy.name).toBe('flo@example.test');
  });

  it('refuses a second operation and says who holds the agent', async () => {
    await service.begin(ORG, AGENT, 'import', 'sess-1', 'user-1', 'waiting_for_agent');

    await expect(
      service.begin(ORG, AGENT, 'export', 'cmd-2', 'user-2', 'exporting'),
    ).rejects.toThrow(
      new ConflictException('A backup import started by Flo is still running on this agent'),
    );
    expect((await service.current(AGENT))?.id).toBe('sess-1');
  });

  it('lets another agent run its own operation at the same time', async () => {
    await service.begin(ORG, AGENT, 'import', 'sess-1', 'user-1', 'waiting_for_agent');

    await expect(
      service.begin(ORG, 'agent-2', 'export', 'cmd-2', 'user-1', 'exporting'),
    ).resolves.toBeUndefined();
  });

  it('moves the operation on, renews its time and announces the step', async () => {
    await service.begin(ORG, AGENT, 'import', 'sess-1', 'user-1', 'waiting_for_agent');
    redis.ttls.set(`site-agent-backup:active:${AGENT}`, 1);

    await service.advance(ORG, AGENT, 'sess-1', 'waiting_for_mapping');

    expect((await service.current(AGENT))?.step).toBe('waiting_for_mapping');
    expect(redis.ttls.get(`site-agent-backup:active:${AGENT}`)).toBe(600);
    expect(announced()).toHaveLength(2);
  });

  it('ignores steps and endings of an operation that no longer holds the agent', async () => {
    await service.begin(ORG, AGENT, 'import', 'sess-1', 'user-1', 'waiting_for_agent');

    await service.advance(ORG, AGENT, 'old', 'applying');
    await service.end(ORG, AGENT, 'old');

    expect((await service.current(AGENT))?.step).toBe('waiting_for_agent');
    expect(announced()).toHaveLength(1);
  });

  it('frees the agent at the end and announces that nothing runs', async () => {
    await service.begin(ORG, AGENT, 'export', 'cmd-1', 'user-1', 'exporting');

    await service.end(ORG, AGENT, 'cmd-1');

    expect(await service.current(AGENT)).toBeNull();
    expect(announced()).toEqual([expect.any(Object), null]);
    await expect(
      service.begin(ORG, AGENT, 'import', 'sess-2', 'user-1', 'waiting_for_agent'),
    ).resolves.toBeUndefined();
  });

  it('does nothing when asked to end or advance with nothing running', async () => {
    await service.advance(ORG, AGENT, 'x', 'applying');
    await service.end(ORG, AGENT, 'x');

    expect(announced()).toEqual([]);
  });

  it('names no one when the holder vanished between the two reads', async () => {
    jest.spyOn(redis, 'set').mockResolvedValueOnce(null);

    await expect(
      service.begin(ORG, AGENT, 'export', 'cmd-1', 'user-1', 'exporting'),
    ).rejects.toThrow('A backup operation is still running on this agent');
  });
});
