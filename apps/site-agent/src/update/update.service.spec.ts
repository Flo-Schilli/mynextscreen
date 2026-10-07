import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UpdateService, updateSentinelPath } from './update.service';

describe('UpdateService', () => {
  let stateDir: string;
  let service: UpdateService;

  beforeEach(async () => {
    stateDir = await mkdtemp(join(tmpdir(), 'mns-update-'));
    service = new UpdateService(updateSentinelPath(stateDir), '1.2.3');
  });

  afterEach(async () => {
    await rm(stateDir, { recursive: true, force: true });
  });

  it('writes a sentinel the host updater can read', async () => {
    await service.requestUpdate('cmd-1');

    const body = await readFile(updateSentinelPath(stateDir), 'utf8');
    const parsed = JSON.parse(body) as { commandId: string; fromVersion: string };
    expect(parsed.commandId).toBe('cmd-1');
    expect(parsed.fromVersion).toBe('1.2.3');
  });

  it('writes the sentinel world-readable so the host path unit can see it', async () => {
    await service.requestUpdate('cmd-1');

    const mode = (await stat(updateSentinelPath(stateDir))).mode & 0o777;
    expect(mode).toBe(0o644);
  });

  it('is idempotent across repeated requests', async () => {
    await service.requestUpdate('cmd-1');
    await service.requestUpdate('cmd-2');

    const body = await readFile(updateSentinelPath(stateDir), 'utf8');
    expect((JSON.parse(body) as { commandId: string }).commandId).toBe('cmd-2');
  });

  it('rejects when the state directory cannot be written', async () => {
    const broken = new UpdateService(join(stateDir, 'missing', 'update-requested'), '1.2.3');

    await expect(broken.requestUpdate('cmd-1')).rejects.toThrow();
  });
});
