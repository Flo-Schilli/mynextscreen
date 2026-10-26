import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SiteAgentBackupService } from './site-agent-backup.service';
import { SiteAgentCommandType } from './site-agent-command.enum';
import {
  SITE_AGENT_BACKUP_EXPORTED,
  SITE_AGENT_BACKUP_IMPORTED,
  SITE_AGENT_BACKUP_IMPORT_KEY,
} from './site-agent-backup.event';
import {
  AUDIT_SITE_AGENT_BACKUP_EXPORTED,
  AUDIT_SITE_AGENT_BACKUP_IMPORTED,
} from '../audit-log/audit.events';
import type { BackupRestoreVerdict } from './screen-remote-control.service';

const ORG = '11111111-1111-4111-8111-111111111111';
const OTHER_ORG = '99999999-9999-4999-8999-999999999999';
const AGENT = '22222222-2222-4222-8222-222222222222';
const OTHER_AGENT = '33333333-3333-4333-8333-333333333333';
const USER = '44444444-4444-4444-8444-444444444444';
const OTHER_USER = '55555555-5555-4555-8555-555555555555';
const SCREEN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PUB = 'B'.repeat(88);

/** Just enough of ioredis: get/set with EX, del. Records the TTLs it was given. */
class FakeRedis {
  readonly store = new Map<string, string>();
  readonly ttls = new Map<string, number>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }

  set(key: string, value: string, _mode: 'EX', seconds: number): Promise<'OK'> {
    this.store.set(key, value);
    this.ttls.set(key, seconds);
    return Promise.resolve('OK');
  }

  del(key: string): Promise<number> {
    return Promise.resolve(this.store.delete(key) ? 1 : 0);
  }
}

describe('SiteAgentBackupService', () => {
  let redis: FakeRedis;
  let agents: { findOne: jest.Mock };
  let sse: { push: jest.Mock };
  let remoteControls: { restoreFromBackup: jest.Mock };
  let emitter: { emit: jest.Mock };
  let service: SiteAgentBackupService;

  const verdict: BackupRestoreVerdict = {
    restored: [{ screenId: SCREEN, created: true, filled: ['localIp'] }],
    skipped: [{ screenId: OTHER_AGENT, reason: 'screen_not_found' }],
  };

  beforeEach(() => {
    redis = new FakeRedis();
    agents = { findOne: jest.fn().mockResolvedValue({ id: AGENT }) };
    sse = { push: jest.fn().mockReturnValue(true) };
    remoteControls = { restoreFromBackup: jest.fn().mockResolvedValue(verdict) };
    emitter = { emit: jest.fn() };
    service = new SiteAgentBackupService(
      redis as never,
      agents as never,
      sse as never,
      remoteControls as never,
      emitter as never,
    );
  });

  function emitted(event: string): unknown[] {
    return emitter.emit.mock.calls.filter(([name]) => name === event).map(([, payload]) => payload);
  }

  describe('export', () => {
    it('pushes the command with the tab key and parks a record for ten minutes', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);

      expect(agents.findOne).toHaveBeenCalledWith(ORG, AGENT);
      expect(sse.push).toHaveBeenCalledWith(AGENT, {
        commandId,
        type: SiteAgentCommandType.ExportBackup,
        recipientPublicKey: PUB,
      });
      expect(redis.ttls.get(`site-agent-backup:export:${commandId}`)).toBe(600);
    });

    it('answers 409 and keeps nothing when the agent is offline', async () => {
      sse.push.mockReturnValue(false);

      await expect(service.startExport(ORG, AGENT, USER, PUB)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(redis.store.size).toBe(0);
    });

    it('stores the upload, tells the dashboard and audits without the file', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);

      await service.receiveExport(AGENT, commandId, { backup: 'QUJD', sealedPassword: 'c2Vh' });

      expect(emitted(SITE_AGENT_BACKUP_EXPORTED)).toEqual([
        expect.objectContaining({ agentId: AGENT, organisationId: ORG, commandId, error: null }),
      ]);
      const [audit] = emitted(AUDIT_SITE_AGENT_BACKUP_EXPORTED) as Array<{
        userId: string;
        details: Record<string, unknown>;
      }>;
      expect(audit.userId).toBe(USER);
      expect(audit.details).toEqual({ sizeBytes: 3 });
      expect(JSON.stringify(audit)).not.toContain('QUJD');
    });

    it('relays an agent-side failure without auditing an export', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);

      await service.receiveExport(AGENT, commandId, { error: 'no configuration yet' });

      expect(emitted(SITE_AGENT_BACKUP_EXPORTED)).toEqual([
        expect.objectContaining({ error: 'no configuration yet' }),
      ]);
      expect(emitted(AUDIT_SITE_AGENT_BACKUP_EXPORTED)).toEqual([]);
    });

    it('treats a half upload as a failure', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);

      await service.receiveExport(AGENT, commandId, { backup: 'QUJD' });

      expect(emitted(SITE_AGENT_BACKUP_EXPORTED)).toEqual([
        expect.objectContaining({ error: 'The agent sent an incomplete export' }),
      ]);
    });

    it.each([
      ['another agent', OTHER_AGENT],
      ['an unknown id', null],
    ])('refuses an upload from %s', async (_label, uploader) => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);
      const id = uploader ? commandId : '66666666-6666-4666-8666-666666666666';

      await expect(
        service.receiveExport(uploader ?? AGENT, id, { backup: 'QUJD', sealedPassword: 'c2Vh' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('accepts one upload per command', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);
      await service.receiveExport(AGENT, commandId, { backup: 'QUJD', sealedPassword: 'c2Vh' });

      await expect(
        service.receiveExport(AGENT, commandId, { backup: 'WFla', sealedPassword: 'c2Vh' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hands the result to the person who asked, exactly once', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);
      await service.receiveExport(AGENT, commandId, { backup: 'QUJD', sealedPassword: 'c2Vh' });

      await expect(service.collectExport(ORG, AGENT, USER, commandId)).resolves.toEqual({
        backup: 'QUJD',
        sealedPassword: 'c2Vh',
      });
      await expect(service.collectExport(ORG, AGENT, USER, commandId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it.each([
      ['another admin of the same organisation', ORG, AGENT, OTHER_USER],
      ['another organisation', OTHER_ORG, AGENT, USER],
      ['the wrong agent', ORG, OTHER_AGENT, USER],
    ])('does not hand the result to %s', async (_label, org, agent, user) => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);
      await service.receiveExport(AGENT, commandId, { backup: 'QUJD', sealedPassword: 'c2Vh' });

      await expect(service.collectExport(org, agent, user, commandId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      // And the rightful owner can still collect it.
      await expect(service.collectExport(ORG, AGENT, USER, commandId)).resolves.toBeDefined();
    });

    it('answers 409 while the agent is still working', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);

      await expect(service.collectExport(ORG, AGENT, USER, commandId)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('passes on the agent error when collected, then forgets it', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);
      await service.receiveExport(AGENT, commandId, { error: 'disk full' });

      await expect(service.collectExport(ORG, AGENT, USER, commandId)).rejects.toThrow(
        new BadRequestException('disk full'),
      );
      expect(redis.store.size).toBe(0);
    });
  });

  describe('import', () => {
    /** Walks a session up to the point where the agent has fetched the file. */
    async function fetchedSession(): Promise<string> {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);
      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });
      await service.stageImport(ORG, AGENT, USER, {
        sessionId,
        backup: 'QUJD',
        sealedPassword: 'c2Vh',
      });
      await service.fetchImport(AGENT, sessionId);
      return sessionId;
    }

    it('opens a session by asking the agent for a key', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);

      expect(sse.push).toHaveBeenCalledWith(AGENT, {
        commandId: sessionId,
        type: SiteAgentCommandType.BeginBackupImport,
      });
    });

    it('answers 409 and keeps nothing when the agent is offline', async () => {
      sse.push.mockReturnValue(false);

      await expect(service.startImport(ORG, AGENT, USER)).rejects.toBeInstanceOf(ConflictException);
      expect(redis.store.size).toBe(0);
    });

    it('relays the agent key to the dashboard', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);

      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });

      expect(emitted(SITE_AGENT_BACKUP_IMPORT_KEY)).toEqual([
        expect.objectContaining({ sessionId, publicKey: PUB, error: null }),
      ]);
    });

    it('ends the session when the agent could not make a key', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);

      await service.receiveImportKey(AGENT, sessionId, {});

      expect(emitted(SITE_AGENT_BACKUP_IMPORT_KEY)).toEqual([
        expect.objectContaining({ publicKey: null, error: 'The agent sent no key' }),
      ]);
      expect(redis.store.size).toBe(0);
    });

    it('refuses a key for a session of another agent', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);

      await expect(
        service.receiveImportKey(OTHER_AGENT, sessionId, { publicKey: PUB }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('stages the file and tells the agent to fetch it', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);
      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });

      const { commandId } = await service.stageImport(ORG, AGENT, USER, {
        sessionId,
        backup: 'QUJD',
        sealedPassword: 'c2Vh',
      });

      expect(sse.push).toHaveBeenLastCalledWith(AGENT, {
        commandId,
        type: SiteAgentCommandType.ImportBackup,
        sessionId,
      });
    });

    it('refuses a file before the agent has sent its key', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);

      await expect(
        service.stageImport(ORG, AGENT, USER, {
          sessionId,
          backup: 'QUJD',
          sealedPassword: 'c2Vh',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses a file from someone other than whoever opened the session', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);
      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });

      await expect(
        service.stageImport(ORG, AGENT, OTHER_USER, {
          sessionId,
          backup: 'QUJD',
          sealedPassword: 'c2Vh',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('drops the staged file when the agent went offline in between', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);
      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });
      sse.push.mockReturnValue(false);

      await expect(
        service.stageImport(ORG, AGENT, USER, {
          sessionId,
          backup: 'QUJD',
          sealedPassword: 'c2Vh',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(redis.store.size).toBe(0);
    });

    it('lets the agent fetch the file once and forgets the copy', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);
      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });
      await service.stageImport(ORG, AGENT, USER, {
        sessionId,
        backup: 'QUJD',
        sealedPassword: 'c2Vh',
      });

      await expect(service.fetchImport(AGENT, sessionId)).resolves.toEqual({
        backup: 'QUJD',
        sealedPassword: 'c2Vh',
      });
      expect(redis.store.get(`site-agent-backup:import:${sessionId}`)).not.toContain('QUJD');
      await expect(service.fetchImport(AGENT, sessionId)).rejects.toBeInstanceOf(ConflictException);
    });

    it('applies the settings for the agent and returns which screens it may write', async () => {
      const sessionId = await fetchedSession();
      const screens = [{ screenId: SCREEN, localIp: '10.0.0.1' }];

      const answer = await service.restore(AGENT, sessionId, {
        sourceAgentId: OTHER_AGENT,
        screens,
      });

      expect(remoteControls.restoreFromBackup).toHaveBeenCalledWith(ORG, AGENT, screens);
      expect(answer).toEqual({ assignedScreenIds: [SCREEN], skipped: verdict.skipped });
    });

    it('refuses to apply settings twice', async () => {
      const sessionId = await fetchedSession();
      await service.restore(AGENT, sessionId, { sourceAgentId: OTHER_AGENT, screens: [] });

      await expect(
        service.restore(AGENT, sessionId, { sourceAgentId: OTHER_AGENT, screens: [] }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('reports the finished import and audits it with ids and counts only', async () => {
      const sessionId = await fetchedSession();
      await service.restore(AGENT, sessionId, {
        sourceAgentId: OTHER_AGENT,
        screens: [{ screenId: SCREEN, devmodePassphrase: 'SECRET' }],
      });

      await service.receiveImportResult(AGENT, sessionId, {
        ssapRestored: 1,
        devmodeKeysRestored: 1,
        staleSsapScreenIds: [],
      });

      expect(emitted(SITE_AGENT_BACKUP_IMPORTED)).toEqual([
        expect.objectContaining({
          sessionId,
          error: null,
          summary: {
            ssapRestored: 1,
            devmodeKeysRestored: 1,
            staleSsapScreenIds: [],
            restored: verdict.restored,
            skipped: verdict.skipped,
          },
        }),
      ]);
      const [audit] = emitted(AUDIT_SITE_AGENT_BACKUP_IMPORTED);
      expect(audit).toEqual(
        expect.objectContaining({
          userId: USER,
          details: {
            sourceAgentId: OTHER_AGENT,
            restored: verdict.restored,
            skipped: verdict.skipped,
          },
        }),
      );
      expect(JSON.stringify(audit)).not.toContain('SECRET');
      expect(redis.store.size).toBe(0);
    });

    it('audits the change when it is applied, even if the agent never reports back', async () => {
      const sessionId = await fetchedSession();

      await service.restore(AGENT, sessionId, { sourceAgentId: OTHER_AGENT, screens: [] });

      expect(emitted(AUDIT_SITE_AGENT_BACKUP_IMPORTED)).toHaveLength(1);
      expect(emitted(SITE_AGENT_BACKUP_IMPORTED)).toEqual([]);
    });

    it('drops stale-key claims for screens the server did not restore', async () => {
      const sessionId = await fetchedSession();
      await service.restore(AGENT, sessionId, { sourceAgentId: OTHER_AGENT, screens: [] });

      await service.receiveImportResult(AGENT, sessionId, {
        staleSsapScreenIds: [SCREEN, OTHER_AGENT],
      });

      expect(emitted(SITE_AGENT_BACKUP_IMPORTED)).toEqual([
        expect.objectContaining({
          summary: expect.objectContaining({ staleSsapScreenIds: [SCREEN] }),
        }),
      ]);
    });

    it('relays an agent-side failure at any stage and ends the session', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);

      await service.receiveImportResult(AGENT, sessionId, { error: 'Wrong password' });

      expect(emitted(SITE_AGENT_BACKUP_IMPORTED)).toEqual([
        expect.objectContaining({ summary: null, error: 'Wrong password' }),
      ]);
      expect(emitted(AUDIT_SITE_AGENT_BACKUP_IMPORTED)).toEqual([]);
      expect(redis.store.size).toBe(0);
    });

    it('refuses a success report for an import that was never applied', async () => {
      const sessionId = await fetchedSession();

      await expect(
        service.receiveImportResult(AGENT, sessionId, { ssapRestored: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses a result from another agent', async () => {
      const { sessionId } = await service.startImport(ORG, AGENT, USER);

      await expect(
        service.receiveImportResult(OTHER_AGENT, sessionId, { error: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
