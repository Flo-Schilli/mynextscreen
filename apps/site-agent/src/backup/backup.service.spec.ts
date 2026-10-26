import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DevmodeKeyService } from '../tv/devmode-key.service';
import { MANIFEST_VERSION } from '../tv/ssap-client';
import { SsapKeyStore } from '../tv/ssap-key.store';
import type { AgentConfigMessage, AgentScreenConfigMessage } from '../protocol/server-protocol';
import { openBackup, readBackupHeader } from './backup-crypto';
import { BackupService, validatePayload } from './backup.service';
import { generateSealedBoxKeyPair, open, seal } from './sealed-box';

const ORG = '11111111-1111-4111-8111-111111111111';
const AGENT_A = '22222222-2222-4222-8222-222222222222';
const AGENT_B = '33333333-3333-4333-8333-333333333333';
const SCREEN_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SCREEN_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COMMAND = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SESSION = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PEM =
  '-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nabc\n-----END RSA PRIVATE KEY-----\n';

/** The server's answer when every entry stays on its own screen. */
function direct(...ids: string[]) {
  return ids.map((id) => ({ from: id, to: id, overwrite: false }));
}

function screen(screenId: string, overrides: Partial<AgentScreenConfigMessage> = {}) {
  return {
    screenId,
    name: `Screen ${screenId.slice(0, 4)}`,
    localIp: '192.168.1.20',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    ssapPort: 3001,
    devmodePassphrase: 'A1B2C3',
    ...overrides,
  } as AgentScreenConfigMessage;
}

function config(agentId: string, screens: AgentScreenConfigMessage[], organisationId = ORG) {
  return { agentId, organisationId, probeIntervalMs: 60_000, screens } as AgentConfigMessage;
}

interface Agent {
  dir: string;
  service: BackupService;
  ssapKeys: SsapKeyStore;
  devmodeKeys: DevmodeKeyService;
  configs: { current: jest.Mock; save: jest.Mock };
  client: {
    fetchConfig: jest.Mock;
    uploadBackupExport: jest.Mock;
    postBackupImportKey: jest.Mock;
    fetchBackupImport: jest.Mock;
    restoreBackupSettings: jest.Mock;
    postBackupAnalysis: jest.Mock;
    postBackupImportResult: jest.Mock;
  };
}

/**
 * An agent with `current` as its cached config. Its session belongs to the same
 * organisation unless `connectionOrg` says otherwise; `null` means not enrolled.
 */
async function makeAgent(
  current: AgentConfigMessage | null,
  connectionOrg: string | null = current?.organisationId ?? null,
): Promise<Agent> {
  const dir = await mkdtemp(join(tmpdir(), 'mns-backup-'));
  const ssapKeys = new SsapKeyStore(join(dir, 'ssap'));
  const devmodeKeys = new DevmodeKeyService(join(dir, 'keys'));
  const configs = { current: jest.fn().mockReturnValue(current), save: jest.fn() };
  const connections = {
    load: jest.fn().mockResolvedValue(connectionOrg ? { organisationId: connectionOrg } : null),
  };
  const client = {
    fetchConfig: jest.fn().mockRejectedValue(new Error('server unreachable')),
    uploadBackupExport: jest.fn().mockResolvedValue(undefined),
    postBackupImportKey: jest.fn().mockResolvedValue(undefined),
    fetchBackupImport: jest.fn(),
    restoreBackupSettings: jest.fn(),
    postBackupAnalysis: jest.fn().mockResolvedValue(undefined),
    postBackupImportResult: jest.fn().mockResolvedValue(undefined),
  };
  const service = new BackupService(
    configs as never,
    connections as never,
    client as never,
    ssapKeys,
    devmodeKeys,
    '0.30.0',
  );
  return { dir, service, ssapKeys, devmodeKeys, configs, client };
}

describe('BackupService', () => {
  const agents: Agent[] = [];

  async function agent(
    current: AgentConfigMessage | null,
    connectionOrg?: string | null,
  ): Promise<Agent> {
    const made = await makeAgent(current, connectionOrg);
    agents.push(made);
    return made;
  }

  afterEach(async () => {
    await Promise.all(agents.splice(0).map((a) => rm(a.dir, { recursive: true, force: true })));
  });

  /** Runs a real export on `source` and returns the file plus its password. */
  async function exportFrom(source: Agent): Promise<{ backup: string; password: string }> {
    const tab = await generateSealedBoxKeyPair();
    await source.service.export(COMMAND, tab.publicKey);
    const [, message] = source.client.uploadBackupExport.mock.calls[0] as [
      string,
      { backup: string; sealedPassword: string },
    ];
    return { backup: message.backup, password: await open(tab, message.sealedPassword) };
  }

  /** Has the dashboard seal `password` for `target`'s import session. */
  async function stageImport(target: Agent, backup: string, password: string): Promise<void> {
    await target.service.beginImport(SESSION);
    const [, { publicKey }] = target.client.postBackupImportKey.mock.calls[0] as [
      string,
      { publicKey: string },
    ];
    target.client.fetchBackupImport.mockResolvedValue({
      backup,
      sealedPassword: await seal(publicKey, password),
    });
  }

  async function seededSource(): Promise<Agent> {
    const source = await agent(config(AGENT_A, [screen(SCREEN_1), screen(SCREEN_2)]));
    await source.ssapKeys.save(SCREEN_1, 'pairing-key-1');
    await source.devmodeKeys.restorePem(SCREEN_1, PEM);
    return source;
  }

  describe('export', () => {
    it('seals keys and settings and uploads them with the password sealed for the tab', async () => {
      const source = await seededSource();

      const { backup, password } = await exportFrom(source);
      const file = Buffer.from(backup, 'base64');
      const { payload } = await openBackup(file, password);

      expect(source.client.uploadBackupExport).toHaveBeenCalledWith(COMMAND, expect.any(Object));
      expect(readBackupHeader(file)).toMatchObject({
        organisationId: ORG,
        sourceAgentId: AGENT_A,
        agentVersion: '0.30.0',
        screenCount: 2,
      });
      expect(payload).toEqual({
        screens: {
          [SCREEN_1]: {
            name: `Screen ${SCREEN_1.slice(0, 4)}`,
            ssap: { key: 'pairing-key-1', manifestVersion: MANIFEST_VERSION },
            devmodePem: PEM,
            devmodePassphrase: 'A1B2C3',
            localIp: '192.168.1.20',
            macAddress: 'AA:BB:CC:DD:EE:FF',
            ssapPort: 3001,
          },
          [SCREEN_2]: {
            name: `Screen ${SCREEN_2.slice(0, 4)}`,
            devmodePassphrase: 'A1B2C3',
            localIp: '192.168.1.20',
            macAddress: 'AA:BB:CC:DD:EE:FF',
            ssapPort: 3001,
          },
        },
      });
    });

    it('leaves unset settings out instead of carrying nulls', async () => {
      const source = await agent(
        config(AGENT_A, [screen(SCREEN_1, { localIp: null, devmodePassphrase: null })]),
      );

      const { backup, password } = await exportFrom(source);
      const { payload } = await openBackup(Buffer.from(backup, 'base64'), password);

      expect((payload as { screens: Record<string, object> }).screens[SCREEN_1]).toEqual({
        name: `Screen ${SCREEN_1.slice(0, 4)}`,
        macAddress: 'AA:BB:CC:DD:EE:FF',
        ssapPort: 3001,
      });
    });

    it('reports a failure when there is no key to seal the password for', async () => {
      const source = await seededSource();

      await source.service.export(COMMAND, undefined);

      expect(source.client.uploadBackupExport).toHaveBeenCalledWith(COMMAND, {
        error: 'The request carried no key to seal the password for',
      });
    });

    it('pulls the config itself when the first round has not run yet', async () => {
      const source = await agent(null, ORG);
      const fetched = config(AGENT_A, [screen(SCREEN_1)]);
      source.client.fetchConfig.mockResolvedValue(fetched);

      const { backup, password } = await exportFrom(source);
      const { payload } = await openBackup(Buffer.from(backup, 'base64'), password);

      expect(source.configs.save).toHaveBeenCalledWith(fetched);
      expect(Object.keys((payload as { screens: object }).screens)).toEqual([SCREEN_1]);
    });

    it('reports a failure when there is no config and none can be fetched', async () => {
      const source = await agent(null, ORG);

      await source.service.export(COMMAND, (await generateSealedBoxKeyPair()).publicKey);

      expect(source.client.uploadBackupExport).toHaveBeenCalledWith(COMMAND, {
        error: 'server unreachable',
      });
    });

    it('survives the failure report itself failing', async () => {
      const source = await agent(null);
      source.client.uploadBackupExport.mockRejectedValue(new Error('offline'));

      await expect(source.service.export(COMMAND, 'PUB')).resolves.toBeUndefined();
    });

    it('refuses a command id that is not a UUID', async () => {
      const source = await seededSource();

      await expect(source.service.export('../../x', 'PUB')).rejects.toThrow('not a UUID');
      expect(source.client.uploadBackupExport).not.toHaveBeenCalled();
    });
  });

  describe('import', () => {
    it('opens the file, describes it by name and id, and writes nothing yet', async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      await stageImport(target, backup, password);

      await target.service.import(SESSION);

      expect(target.client.postBackupAnalysis).toHaveBeenCalledWith(SESSION, {
        sourceAgentId: AGENT_A,
        entries: [
          { screenId: SCREEN_1, name: `Screen ${SCREEN_1.slice(0, 4)}` },
          { screenId: SCREEN_2, name: `Screen ${SCREEN_2.slice(0, 4)}` },
        ],
      });
      expect(JSON.stringify(target.client.postBackupAnalysis.mock.calls)).not.toContain('A1B2C3');
      expect(target.client.restoreBackupSettings).not.toHaveBeenCalled();
      expect(target.client.postBackupImportResult).not.toHaveBeenCalled();
      expect(await target.ssapKeys.readRaw(SCREEN_1)).toBeNull();
    });

    it("writes a mapped entry under its new screen and replaces that screen's keys", async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      await target.ssapKeys.save(SCREEN_2, 'key-of-the-other-tv');
      target.client.restoreBackupSettings.mockResolvedValue({
        assignments: [{ from: SCREEN_1, to: SCREEN_2, overwrite: true }],
        skipped: [],
      });
      await stageImport(target, backup, password);

      await target.service.import(SESSION);
      await target.service.apply(SESSION);

      expect(await target.ssapKeys.load(SCREEN_2)).toBe('pairing-key-1');
      expect(await target.devmodeKeys.cachedPem(SCREEN_2)).toBe(PEM);
      expect(await target.ssapKeys.readRaw(SCREEN_1)).toBeNull();
    });

    it('applies an opened file once only', async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      target.client.restoreBackupSettings.mockResolvedValue({ assignments: [], skipped: [] });
      await stageImport(target, backup, password);
      await target.service.import(SESSION);
      await target.service.apply(SESSION);
      target.client.postBackupImportResult.mockClear();

      await target.service.apply(SESSION);

      expect(target.client.restoreBackupSettings).toHaveBeenCalledTimes(1);
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'The import session has expired; start the import again',
      });
    });

    it('refuses to apply a session whose file was never opened', async () => {
      const target = await agent(config(AGENT_B, []));
      await target.service.beginImport(SESSION);

      await target.service.apply(SESSION);

      expect(target.client.restoreBackupSettings).not.toHaveBeenCalled();
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'The import session has expired; start the import again',
      });
    });

    it('refuses to open the same session twice', async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      await stageImport(target, backup, password);
      await target.service.import(SESSION);

      await target.service.import(SESSION);

      expect(target.client.postBackupAnalysis).toHaveBeenCalledTimes(1);
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'The import session has expired; start the import again',
      });
    });

    it('lets an opened file wait for the mapping, but not forever', async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      await stageImport(target, backup, password);
      const now = Date.now();
      const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
      await target.service.import(SESSION);
      clock.mockReturnValue(now + 11 * 60_000);

      await target.service.apply(SESSION);
      clock.mockRestore();

      expect(target.client.restoreBackupSettings).not.toHaveBeenCalled();
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'The import session has expired; start the import again',
      });
    });

    it('restores keys on another agent for the screens the server assigns', async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      const imported = jest.fn().mockResolvedValue(undefined);
      target.service.onImported(imported);
      target.client.restoreBackupSettings.mockResolvedValue({
        assignments: direct(SCREEN_1, SCREEN_2),
        skipped: [],
      });
      await stageImport(target, backup, password);

      await target.service.import(SESSION);
      await target.service.apply(SESSION);

      expect(target.client.restoreBackupSettings).toHaveBeenCalledWith(SESSION, {
        sourceAgentId: AGENT_A,
        screens: expect.arrayContaining([
          {
            screenId: SCREEN_1,
            devmodePassphrase: 'A1B2C3',
            localIp: '192.168.1.20',
            macAddress: 'AA:BB:CC:DD:EE:FF',
            ssapPort: 3001,
            hasSsapKey: true,
            hasDevmodeKey: true,
          },
        ]),
      });
      expect(await target.ssapKeys.load(SCREEN_1)).toBe('pairing-key-1');
      expect(await target.devmodeKeys.cachedPem(SCREEN_1)).toBe(PEM);
      expect(await readFile(join(target.dir, 'ssap', `${SCREEN_1}.key`), 'utf8')).toEqual(
        await readFile(join(source.dir, 'ssap', `${SCREEN_1}.key`), 'utf8'),
      );
      expect((await stat(join(target.dir, 'ssap', `${SCREEN_1}.key`))).mode & 0o777).toBe(0o600);
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        ssapRestored: 1,
        devmodeKeysRestored: 1,
        staleSsapScreenIds: [],
      });
      expect(imported).toHaveBeenCalled();
    });

    it('keeps a key the agent already has instead of putting back an older one', async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      await target.ssapKeys.save(SCREEN_1, 'newer-pairing-key');
      await target.devmodeKeys.restorePem(SCREEN_1, `${PEM}newer`);
      target.client.restoreBackupSettings.mockResolvedValue({
        assignments: direct(SCREEN_1),
        skipped: [],
      });
      await stageImport(target, backup, password);

      await target.service.import(SESSION);
      await target.service.apply(SESSION);

      expect(await target.ssapKeys.load(SCREEN_1)).toBe('newer-pairing-key');
      expect(await target.devmodeKeys.cachedPem(SCREEN_1)).toBe(`${PEM}newer`);
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        ssapRestored: 0,
        devmodeKeysRestored: 0,
        staleSsapScreenIds: [],
      });
    });

    it('writes nothing for a screen the server did not assign to this agent', async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      target.client.restoreBackupSettings.mockResolvedValue({
        assignments: direct(SCREEN_2),
        skipped: [{ screenId: SCREEN_1, reason: 'other_agent' }],
      });
      await stageImport(target, backup, password);

      await target.service.import(SESSION);
      await target.service.apply(SESSION);

      expect(await target.ssapKeys.readRaw(SCREEN_1)).toBeNull();
      expect(await target.devmodeKeys.cachedPem(SCREEN_1)).toBeNull();
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        ssapRestored: 0,
        devmodeKeysRestored: 0,
        staleSsapScreenIds: [],
      });
    });

    it('restores a key from an older manifest but reports it as stale', async () => {
      const source = await seededSource();
      await source.ssapKeys.restoreRaw(SCREEN_1, { key: 'old', manifestVersion: 1 });
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      target.client.restoreBackupSettings.mockResolvedValue({
        assignments: direct(SCREEN_1),
        skipped: [],
      });
      await stageImport(target, backup, password);

      await target.service.import(SESSION);
      await target.service.apply(SESSION);

      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(
        SESSION,
        expect.objectContaining({ staleSsapScreenIds: [SCREEN_1] }),
      );
    });

    it('refuses a backup from another organisation without asking the server', async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, [], '99999999-9999-4999-8999-999999999999'));
      await stageImport(target, backup, password);

      await target.service.import(SESSION);

      expect(target.client.restoreBackupSettings).not.toHaveBeenCalled();
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'This backup belongs to a different organisation',
      });
    });

    it('reports a wrong password without writing anything', async () => {
      const source = await seededSource();
      const { backup } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      await stageImport(target, backup, 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF');

      await target.service.import(SESSION);

      expect(target.client.restoreBackupSettings).not.toHaveBeenCalled();
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'Wrong password, or the file is damaged',
      });
    });

    it('reports a password sealed for a different key', async () => {
      const target = await agent(config(AGENT_B, []));
      await target.service.beginImport(SESSION);
      const stranger = await generateSealedBoxKeyPair();
      target.client.fetchBackupImport.mockResolvedValue({
        backup: '',
        sealedPassword: await seal(stranger.publicKey, 'x'),
      });

      await target.service.import(SESSION);

      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'The password could not be unsealed; start the import again',
      });
    });

    it('refuses a session it never opened', async () => {
      const target = await agent(config(AGENT_B, []));

      await target.service.import(SESSION);

      expect(target.client.fetchBackupImport).not.toHaveBeenCalled();
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'The import session has expired; start the import again',
      });
    });

    it('allows one attempt per session', async () => {
      const source = await seededSource();
      const { backup } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      await stageImport(target, backup, 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF');
      await target.service.import(SESSION);
      target.client.postBackupImportResult.mockClear();

      await target.service.import(SESSION);

      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'The import session has expired; start the import again',
      });
    });

    it('refuses a session once it has expired', async () => {
      const target = await agent(config(AGENT_B, []));
      const now = Date.now();
      const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
      await target.service.beginImport(SESSION);
      clock.mockReturnValue(now + 11 * 60_000);

      await target.service.import(SESSION);
      clock.mockRestore();

      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'The import session has expired; start the import again',
      });
    });

    it('drops expired sessions when a new one opens', async () => {
      const target = await agent(config(AGENT_B, []));
      const now = Date.now();
      const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
      await target.service.beginImport(SESSION);
      clock.mockReturnValue(now + 11 * 60_000);
      await target.service.beginImport(COMMAND);
      clock.mockRestore();

      await target.service.import(SESSION);

      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: expect.stringContaining('expired'),
      });
    });

    it('imports on a box enrolled a moment ago, before it has any cached config', async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(null, ORG);
      target.client.restoreBackupSettings.mockResolvedValue({
        assignments: direct(SCREEN_1),
        skipped: [],
      });
      await stageImport(target, backup, password);

      await target.service.import(SESSION);
      await target.service.apply(SESSION);

      expect(await target.ssapKeys.load(SCREEN_1)).toBe('pairing-key-1');
      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(
        SESSION,
        expect.objectContaining({ ssapRestored: 1 }),
      );
    });

    it('refuses on an agent that is not enrolled', async () => {
      const target = await agent(null, null);
      await target.service.beginImport(SESSION);

      await target.service.import(SESSION);

      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'The agent is not enrolled; enrol it before importing',
      });
    });

    it('refuses an oversized upload before opening it', async () => {
      const target = await agent(config(AGENT_B, []));
      await target.service.beginImport(SESSION);
      const [, { publicKey }] = target.client.postBackupImportKey.mock.calls[0] as [
        string,
        { publicKey: string },
      ];
      target.client.fetchBackupImport.mockResolvedValue({
        backup: Buffer.alloc(3 * 1024 * 1024).toString('base64'),
        sealedPassword: await seal(publicKey, 'x'),
      });

      await target.service.import(SESSION);

      expect(target.client.postBackupImportResult).toHaveBeenCalledWith(SESSION, {
        error: 'The file is too large to be a backup',
      });
    });

    it('keeps going when a post-import listener fails', async () => {
      const source = await seededSource();
      const { backup, password } = await exportFrom(source);
      const target = await agent(config(AGENT_B, []));
      target.service.onImported(() => Promise.reject(new Error('server gone')));
      target.client.restoreBackupSettings.mockResolvedValue({
        assignments: direct(),
        skipped: [],
      });
      await stageImport(target, backup, password);

      await expect(target.service.import(SESSION)).resolves.toBeUndefined();
    });

    it('survives the failure report itself failing', async () => {
      const target = await agent(config(AGENT_B, []));
      target.client.postBackupImportResult.mockRejectedValue(new Error('offline'));

      await expect(target.service.import(SESSION)).resolves.toBeUndefined();
    });

    it('refuses a session id that is not a UUID', async () => {
      const target = await agent(config(AGENT_B, []));

      await expect(target.service.beginImport('x/../y')).rejects.toThrow('not a UUID');
      await expect(target.service.import('')).rejects.toThrow('not a UUID');
    });
  });

  describe('validatePayload', () => {
    const valid = { screens: { [SCREEN_1]: { ssap: { key: 'k', manifestVersion: 2 } } } };

    it('accepts a well-formed payload and keeps only known fields', () => {
      const screens = validatePayload({
        screens: { [SCREEN_1]: { ssapPort: 3000, localIp: '10.0.0.1', extra: 'dropped' } },
      });

      expect(screens).toEqual({ [SCREEN_1]: { ssapPort: 3000, localIp: '10.0.0.1' } });
    });

    it.each([
      ['not an object', 'nope'],
      ['no screens', {}],
      ['a screen id that is a path', { screens: { '../../etc': {} } }],
      ['an entry that is not an object', { screens: { [SCREEN_1]: 'x' } }],
      ['a malformed pairing key', { screens: { [SCREEN_1]: { ssap: { key: 1 } } } }],
      ['a PEM that is not one', { screens: { [SCREEN_1]: { devmodePem: 'rm -rf /' } } }],
      ['a non-string address', { screens: { [SCREEN_1]: { localIp: 42 } } }],
      ['a fractional port', { screens: { [SCREEN_1]: { ssapPort: 3000.5 } } }],
      ['a name that is not text', { screens: { [SCREEN_1]: { name: 42 } } }],
      ['an absurdly long name', { screens: { [SCREEN_1]: { name: 'x'.repeat(201) } } }],
    ])('refuses %s', (_label, payload) => {
      expect(() => validatePayload(payload)).toThrow();
    });

    it('refuses more screens than any venue has', () => {
      const screens = Object.fromEntries(
        Array.from({ length: 1001 }, (_, i) => [
          `${i.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`,
          {},
        ]),
      );

      expect(() => validatePayload({ screens })).toThrow('more screens');
    });

    it('accepts the minimal valid payload', () => {
      expect(validatePayload(valid)[SCREEN_1].ssap).toEqual({ key: 'k', manifestVersion: 2 });
    });
  });
});
