import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SiteAgentBackupService } from './site-agent-backup.service';
import { SiteAgentCommandType } from './site-agent-command.enum';
import {
  SITE_AGENT_BACKUP_EXPORTED,
  SITE_AGENT_BACKUP_IMPORTED,
  SITE_AGENT_BACKUP_IMPORT_ANALYSED,
  SITE_AGENT_BACKUP_IMPORT_KEY,
} from './site-agent-backup.event';
import {
  AUDIT_SITE_AGENT_BACKUP_EXPORTED,
  AUDIT_SITE_AGENT_BACKUP_IMPORTED,
} from '../audit-log/audit.events';
import type { BackupPlan, BackupRestoreVerdict } from './site-agent-backup-restore.service';
import { FakeBackupRedis } from '../test/fake-backup-redis';

const ORG = '11111111-1111-4111-8111-111111111111';
const OTHER_ORG = '99999999-9999-4999-8999-999999999999';
const AGENT = '22222222-2222-4222-8222-222222222222';
const OTHER_AGENT = '33333333-3333-4333-8333-333333333333';
const USER = '44444444-4444-4444-8444-444444444444';
const OTHER_USER = '55555555-5555-4555-8555-555555555555';
const SCREEN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GONE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TARGET = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PUB = 'B'.repeat(88);

describe('SiteAgentBackupService', () => {
  let redis: FakeBackupRedis;
  let agents: { findOne: jest.Mock };
  let sse: { push: jest.Mock };
  let restorer: { plan: jest.Mock; validateMappings: jest.Mock; restore: jest.Mock };
  let operations: { begin: jest.Mock; advance: jest.Mock; end: jest.Mock; current: jest.Mock };
  let emitter: { emit: jest.Mock };
  let service: SiteAgentBackupService;

  const plan: BackupPlan = {
    entries: [
      {
        screenId: SCREEN,
        backupName: 'Bar',
        status: 'fill',
        screenName: 'Bar',
        ownerAgentName: null,
      },
      {
        screenId: GONE,
        backupName: 'Foyer',
        status: 'not_found',
        screenName: null,
        ownerAgentName: null,
      },
    ],
    targets: [{ screenId: TARGET, name: 'Foyer (new)', selectable: true, ownerAgentName: null }],
  };
  const verdict: BackupRestoreVerdict = {
    restored: [
      {
        screenId: SCREEN,
        sourceScreenId: SCREEN,
        created: false,
        mapped: false,
        fields: ['localIp'],
      },
      { screenId: TARGET, sourceScreenId: GONE, created: false, mapped: true, fields: ['localIp'] },
    ],
    skipped: [],
  };

  beforeEach(() => {
    redis = new FakeBackupRedis();
    agents = { findOne: jest.fn().mockResolvedValue({ id: AGENT }) };
    sse = { push: jest.fn().mockReturnValue(true) };
    restorer = {
      plan: jest.fn().mockResolvedValue(plan),
      validateMappings: jest.fn(),
      restore: jest.fn().mockResolvedValue(verdict),
    };
    operations = {
      begin: jest.fn().mockResolvedValue(undefined),
      advance: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
      current: jest.fn().mockResolvedValue(null),
    };
    emitter = { emit: jest.fn() };
    service = new SiteAgentBackupService(
      redis as never,
      agents as never,
      sse as never,
      restorer as never,
      operations as never,
      emitter as never,
    );
  });

  function emitted(event: string): unknown[] {
    return emitter.emit.mock.calls.filter(([name]) => name === event).map(([, payload]) => payload);
  }

  it('reports the operation running on an agent', async () => {
    operations.current.mockResolvedValue({ kind: 'export', id: 'x' });

    await expect(service.status(ORG, AGENT)).resolves.toEqual({ kind: 'export', id: 'x' });
    expect(agents.findOne).toHaveBeenCalledWith(ORG, AGENT);
  });

  describe('export', () => {
    it('claims the agent, then pushes the command with the tab key', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);

      expect(operations.begin).toHaveBeenCalledWith(
        ORG,
        AGENT,
        'export',
        commandId,
        USER,
        'exporting',
      );
      expect(sse.push).toHaveBeenCalledWith(AGENT, {
        commandId,
        type: SiteAgentCommandType.ExportBackup,
        recipientPublicKey: PUB,
      });
    });

    it('does not reach the agent while another operation holds it', async () => {
      operations.begin.mockRejectedValue(new ConflictException('busy'));

      await expect(service.startExport(ORG, AGENT, USER, PUB)).rejects.toThrow('busy');
      expect(sse.push).not.toHaveBeenCalled();
      expect(redis.store.size).toBe(0);
    });

    it('answers 409 and frees the agent when it is offline', async () => {
      sse.push.mockReturnValue(false);

      await expect(service.startExport(ORG, AGENT, USER, PUB)).rejects.toThrow(
        'Site agent is offline',
      );
      expect(redis.store.size).toBe(0);
      expect(operations.end).toHaveBeenCalledWith(ORG, AGENT, expect.any(String));
    });

    it('stores the upload, frees the agent, tells the dashboard and audits the size', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);

      await service.receiveExport(AGENT, commandId, { backup: 'QUJD', sealedPassword: 'c2Vh' });

      expect(operations.end).toHaveBeenCalledWith(ORG, AGENT, commandId);
      expect(emitted(SITE_AGENT_BACKUP_EXPORTED)).toEqual([
        expect.objectContaining({ commandId, error: null }),
      ]);
      expect(emitted(AUDIT_SITE_AGENT_BACKUP_EXPORTED)).toEqual([
        expect.objectContaining({ userId: USER, details: { sizeBytes: 3 } }),
      ]);
    });

    it('relays an agent-side failure, frees the agent and audits nothing', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);

      await service.receiveExport(AGENT, commandId, { error: 'no configuration yet' });

      expect(operations.end).toHaveBeenCalled();
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

    it('refuses an upload from another agent, for an unknown id, or twice', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);
      const upload = { backup: 'QUJD', sealedPassword: 'c2Vh' };

      await expect(service.receiveExport(OTHER_AGENT, commandId, upload)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.receiveExport(AGENT, GONE, upload)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await service.receiveExport(AGENT, commandId, upload);
      await expect(service.receiveExport(AGENT, commandId, upload)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('hands the result to the person who asked, exactly once', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);
      await service.receiveExport(AGENT, commandId, { backup: 'QUJD', sealedPassword: 'c2Vh' });

      await expect(service.collectExport(ORG, AGENT, OTHER_USER, commandId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.collectExport(OTHER_ORG, AGENT, USER, commandId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.collectExport(ORG, AGENT, USER, commandId)).resolves.toEqual({
        backup: 'QUJD',
        sealedPassword: 'c2Vh',
      });
      await expect(service.collectExport(ORG, AGENT, USER, commandId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('answers 409 while the agent is still working, and passes on its error once', async () => {
      const { commandId } = await service.startExport(ORG, AGENT, USER, PUB);
      await expect(service.collectExport(ORG, AGENT, USER, commandId)).rejects.toBeInstanceOf(
        ConflictException,
      );

      await service.receiveExport(AGENT, commandId, { error: 'disk full' });

      await expect(service.collectExport(ORG, AGENT, USER, commandId)).rejects.toThrow(
        new BadRequestException('disk full'),
      );
      expect(redis.store.size).toBe(0);
    });
  });

  describe('import', () => {
    const owner = [ORG, AGENT, USER] as const;
    const settings = {
      sourceAgentId: OTHER_AGENT,
      screens: [{ screenId: SCREEN, devmodePassphrase: 'SECRET' }],
    };

    async function opened(): Promise<string> {
      const { sessionId } = await service.startImport(...owner);
      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });
      await service.stageImport(...owner, { sessionId, backup: 'QUJD', sealedPassword: 'c2Vh' });
      await service.fetchImport(AGENT, sessionId);
      return sessionId;
    }

    async function analysed(): Promise<string> {
      const sessionId = await opened();
      await service.receiveAnalysis(AGENT, sessionId, {
        sourceAgentId: OTHER_AGENT,
        entries: [
          { screenId: SCREEN, name: 'Bar' },
          { screenId: GONE, name: 'Foyer' },
        ],
      });
      return sessionId;
    }

    async function applying(): Promise<string> {
      const sessionId = await analysed();
      await service.applyImport(...owner, sessionId, { mappings: [{ from: GONE, to: TARGET }] });
      return sessionId;
    }

    it('claims the agent and asks it for a key', async () => {
      const { sessionId } = await service.startImport(...owner);

      expect(operations.begin).toHaveBeenCalledWith(
        ORG,
        AGENT,
        'import',
        sessionId,
        USER,
        'waiting_for_agent',
      );
      expect(sse.push).toHaveBeenCalledWith(AGENT, {
        commandId: sessionId,
        type: SiteAgentCommandType.BeginBackupImport,
      });
    });

    it('answers 409 and frees the agent when it is offline', async () => {
      sse.push.mockReturnValue(false);

      await expect(service.startImport(...owner)).rejects.toBeInstanceOf(ConflictException);
      expect(redis.store.size).toBe(0);
      expect(operations.end).toHaveBeenCalled();
    });

    it('relays the agent key and moves on to waiting for the file', async () => {
      const { sessionId } = await service.startImport(...owner);

      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });

      expect(operations.advance).toHaveBeenCalledWith(ORG, AGENT, sessionId, 'waiting_for_file');
      expect(emitted(SITE_AGENT_BACKUP_IMPORT_KEY)).toEqual([
        expect.objectContaining({ sessionId, publicKey: PUB, error: null }),
      ]);
    });

    it('ends the session and frees the agent when it could not make a key', async () => {
      const { sessionId } = await service.startImport(...owner);

      await service.receiveImportKey(AGENT, sessionId, {});

      expect(redis.store.size).toBe(0);
      expect(operations.end).toHaveBeenCalledWith(ORG, AGENT, sessionId);
      expect(emitted(SITE_AGENT_BACKUP_IMPORT_KEY)).toEqual([
        expect.objectContaining({ publicKey: null, error: 'The agent sent no key' }),
      ]);
    });

    it('refuses a key for a session of another agent', async () => {
      const { sessionId } = await service.startImport(...owner);

      await expect(
        service.receiveImportKey(OTHER_AGENT, sessionId, { publicKey: PUB }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('stages the file only for its owner, once the key is there', async () => {
      const { sessionId } = await service.startImport(...owner);
      const file = { sessionId, backup: 'QUJD', sealedPassword: 'c2Vh' };
      await expect(service.stageImport(...owner, file)).rejects.toBeInstanceOf(ConflictException);
      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });

      await expect(service.stageImport(ORG, AGENT, OTHER_USER, file)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      const { commandId } = await service.stageImport(...owner, file);

      expect(operations.advance).toHaveBeenCalledWith(ORG, AGENT, sessionId, 'decrypting');
      expect(sse.push).toHaveBeenLastCalledWith(AGENT, {
        commandId,
        type: SiteAgentCommandType.ImportBackup,
        sessionId,
      });
    });

    it('drops the staged file and frees the agent when it went offline in between', async () => {
      const { sessionId } = await service.startImport(...owner);
      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });
      sse.push.mockReturnValue(false);

      await expect(
        service.stageImport(...owner, { sessionId, backup: 'QUJD', sealedPassword: 'c2Vh' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(redis.store.size).toBe(0);
      expect(operations.end).toHaveBeenCalledWith(ORG, AGENT, sessionId);
    });

    it('lets the agent fetch the file once and forgets the copy', async () => {
      const { sessionId } = await service.startImport(...owner);
      await service.receiveImportKey(AGENT, sessionId, { publicKey: PUB });
      await service.stageImport(...owner, { sessionId, backup: 'QUJD', sealedPassword: 'c2Vh' });

      await expect(service.fetchImport(AGENT, sessionId)).resolves.toEqual({
        backup: 'QUJD',
        sealedPassword: 'c2Vh',
      });
      expect(redis.dump()).not.toContain('QUJD');
      await expect(service.fetchImport(AGENT, sessionId)).rejects.toBeInstanceOf(ConflictException);
    });

    it('plans the opened backup and tells the dashboard it is ready', async () => {
      const sessionId = await analysed();

      expect(restorer.plan).toHaveBeenCalledWith(ORG, AGENT, [
        { screenId: SCREEN, name: 'Bar' },
        { screenId: GONE, name: 'Foyer' },
      ]);
      expect(operations.advance).toHaveBeenCalledWith(ORG, AGENT, sessionId, 'waiting_for_mapping');
      expect(emitted(SITE_AGENT_BACKUP_IMPORT_ANALYSED)).toEqual([
        expect.objectContaining({ agentId: AGENT, organisationId: ORG, sessionId }),
      ]);
      await expect(service.getPlan(...owner, sessionId)).resolves.toEqual({
        sourceAgentId: OTHER_AGENT,
        ...plan,
      });
    });

    it('shows the plan only to whoever started the import', async () => {
      const sessionId = await analysed();

      await expect(service.getPlan(ORG, AGENT, OTHER_USER, sessionId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('applies only a valid mapping and then tells the agent to go ahead', async () => {
      const sessionId = await analysed();

      const { commandId } = await service.applyImport(...owner, sessionId, {
        mappings: [{ from: GONE, to: TARGET }],
      });

      expect(restorer.validateMappings).toHaveBeenCalledWith(plan, [{ from: GONE, to: TARGET }]);
      expect(operations.advance).toHaveBeenCalledWith(ORG, AGENT, sessionId, 'applying');
      expect(sse.push).toHaveBeenLastCalledWith(AGENT, {
        commandId,
        type: SiteAgentCommandType.ApplyBackupImport,
        sessionId,
      });
    });

    it('does not reach the agent with a mapping the plan rejects', async () => {
      const sessionId = await analysed();
      restorer.validateMappings.mockImplementation(() => {
        throw new NotFoundException('bad target');
      });
      sse.push.mockClear();

      await expect(
        service.applyImport(...owner, sessionId, { mappings: [{ from: GONE, to: SCREEN }] }),
      ).rejects.toThrow('bad target');
      expect(sse.push).not.toHaveBeenCalled();
    });

    it('lets the owner cancel before it is applied, and frees the agent', async () => {
      const sessionId = await analysed();

      await expect(service.cancelImport(ORG, AGENT, OTHER_USER, sessionId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await service.cancelImport(...owner, sessionId);

      expect(redis.store.size).toBe(0);
      expect(operations.end).toHaveBeenCalledWith(ORG, AGENT, sessionId);
    });

    it('refuses to cancel once the agent is applying', async () => {
      const sessionId = await applying();

      await expect(service.cancelImport(...owner, sessionId)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('restores with the stored mapping, audits it and tells the agent where keys go', async () => {
      const sessionId = await applying();

      const answer = await service.restore(AGENT, sessionId, settings);

      expect(restorer.restore).toHaveBeenCalledWith(ORG, AGENT, settings.screens, [
        { from: GONE, to: TARGET },
      ]);
      expect(answer).toEqual({
        assignments: [
          { from: SCREEN, to: SCREEN, overwrite: false },
          { from: GONE, to: TARGET, overwrite: true },
        ],
        skipped: [],
      });
      const [audit] = emitted(AUDIT_SITE_AGENT_BACKUP_IMPORTED);
      expect(audit).toEqual(
        expect.objectContaining({
          userId: USER,
          details: { sourceAgentId: OTHER_AGENT, restored: verdict.restored, skipped: [] },
        }),
      );
      expect(JSON.stringify(audit)).not.toContain('SECRET');
    });

    it('keeps no passphrase in Redis at any point', async () => {
      const sessionId = await applying();

      await service.restore(AGENT, sessionId, settings);

      expect(redis.dump()).not.toContain('SECRET');
    });

    it('refuses to restore before the mapping is in, or twice', async () => {
      const sessionId = await analysed();
      await expect(service.restore(AGENT, sessionId, settings)).rejects.toBeInstanceOf(
        ConflictException,
      );

      await service.applyImport(...owner, sessionId, { mappings: [] });
      await service.restore(AGENT, sessionId, settings);
      await expect(service.restore(AGENT, sessionId, settings)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('reports the finished import, keeps only stale claims for restored screens, frees the agent', async () => {
      const sessionId = await applying();
      await service.restore(AGENT, sessionId, settings);

      await service.receiveImportResult(AGENT, sessionId, {
        ssapRestored: 2,
        devmodeKeysRestored: 1,
        staleSsapScreenIds: [TARGET, OTHER_AGENT],
      });

      expect(emitted(SITE_AGENT_BACKUP_IMPORTED)).toEqual([
        expect.objectContaining({
          sessionId,
          error: null,
          summary: {
            ssapRestored: 2,
            devmodeKeysRestored: 1,
            staleSsapScreenIds: [TARGET],
            restored: verdict.restored,
            skipped: [],
          },
        }),
      ]);
      expect(operations.end).toHaveBeenCalledWith(ORG, AGENT, sessionId);
      expect(redis.store.size).toBe(0);
    });

    it('relays an agent-side failure at any stage, frees the agent and ends the session', async () => {
      const { sessionId } = await service.startImport(...owner);

      await service.receiveImportResult(AGENT, sessionId, { error: 'Wrong password' });

      expect(emitted(SITE_AGENT_BACKUP_IMPORTED)).toEqual([
        expect.objectContaining({ summary: null, error: 'Wrong password' }),
      ]);
      expect(operations.end).toHaveBeenCalledWith(ORG, AGENT, sessionId);
      expect(redis.store.size).toBe(0);
    });

    it('does not bring back a session cancelled while the server was planning it', async () => {
      const sessionId = await opened();
      restorer.plan.mockImplementation(async () => {
        await service.cancelImport(ORG, AGENT, USER, sessionId);
        return plan;
      });

      await expect(
        service.receiveAnalysis(AGENT, sessionId, { sourceAgentId: OTHER_AGENT, entries: [] }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(redis.store.size).toBe(0);
      expect(emitted(SITE_AGENT_BACKUP_IMPORT_ANALYSED)).toEqual([]);
    });

    it('applies once when the agent calls restore twice at the same time', async () => {
      const sessionId = await applying();

      const results = await Promise.allSettled([
        service.restore(AGENT, sessionId, settings),
        service.restore(AGENT, sessionId, settings),
      ]);

      expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
      expect(restorer.restore).toHaveBeenCalledTimes(1);
      expect(emitted(AUDIT_SITE_AGENT_BACKUP_IMPORTED)).toHaveLength(1);
    });

    it('restores only what the plan listed, whatever else the agent sends', async () => {
      const sessionId = await applying();
      const unplanned = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

      await service.restore(AGENT, sessionId, {
        sourceAgentId: OTHER_AGENT,
        screens: [{ screenId: SCREEN }, { screenId: unplanned }],
      });

      expect(restorer.restore).toHaveBeenCalledWith(
        ORG,
        AGENT,
        [{ screenId: SCREEN }],
        [{ from: GONE, to: TARGET }],
      );
    });

    it('cannot be cancelled while it is being restored', async () => {
      const sessionId = await applying();
      restorer.restore.mockImplementation(async () => {
        await expect(service.cancelImport(...owner, sessionId)).rejects.toBeInstanceOf(
          ConflictException,
        );
        return verdict;
      });

      await service.restore(AGENT, sessionId, settings);

      expect(restorer.restore).toHaveBeenCalled();
    });

    it('frees the agent when the first record cannot be stored', async () => {
      jest.spyOn(redis, 'set').mockRejectedValueOnce(new Error('redis down'));

      await expect(service.startImport(...owner)).rejects.toThrow('redis down');
      expect(operations.end).toHaveBeenCalledWith(ORG, AGENT, expect.any(String));
      expect(sse.push).not.toHaveBeenCalled();
    });

    it('refuses a success report for an import that was never applied', async () => {
      const sessionId = await analysed();

      await expect(
        service.receiveImportResult(AGENT, sessionId, { ssapRestored: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses a result from another agent', async () => {
      const { sessionId } = await service.startImport(...owner);

      await expect(
        service.receiveImportResult(OTHER_AGENT, sessionId, { error: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
