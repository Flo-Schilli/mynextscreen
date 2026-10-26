import { SiteAgentBackupController } from './site-agent-backup.controller';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';

describe('SiteAgentBackupController', () => {
  const org = '11111111-1111-4111-8111-111111111111';
  const agent = '22222222-2222-4222-8222-222222222222';
  const session = '33333333-3333-4333-8333-333333333333';
  const req = { user: { userId: 'user-1' } } as unknown as AuthenticatedRequest;
  let backups: Record<string, jest.Mock>;
  let controller: SiteAgentBackupController;

  beforeEach(() => {
    backups = {
      startExport: jest.fn().mockResolvedValue({ commandId: 'c' }),
      collectExport: jest.fn().mockResolvedValue({ backup: 'b', sealedPassword: 's' }),
      startImport: jest.fn().mockResolvedValue({ sessionId: session }),
      stageImport: jest.fn().mockResolvedValue({ commandId: 'c2' }),
      status: jest.fn().mockResolvedValue(null),
      getPlan: jest.fn().mockResolvedValue({ sourceAgentId: 'a', entries: [], targets: [] }),
      applyImport: jest.fn().mockResolvedValue({ commandId: 'c3' }),
      cancelImport: jest.fn().mockResolvedValue(undefined),
    };
    controller = new SiteAgentBackupController(backups as never);
  });

  it('starts an export for the calling user', async () => {
    await expect(
      controller.startExport(org, agent, { recipientPublicKey: 'PUB' }, req),
    ).resolves.toEqual({ commandId: 'c' });
    expect(backups.startExport).toHaveBeenCalledWith(org, agent, 'user-1', 'PUB');
  });

  it('collects an export as the calling user', async () => {
    await controller.collectExport(org, agent, session, req);
    expect(backups.collectExport).toHaveBeenCalledWith(org, agent, 'user-1', session);
  });

  it('opens an import session for the calling user', async () => {
    await expect(controller.startImport(org, agent, req)).resolves.toEqual({ sessionId: session });
    expect(backups.startImport).toHaveBeenCalledWith(org, agent, 'user-1');
  });

  it('stages an import as the calling user', async () => {
    const dto = { sessionId: session, backup: 'QUJD', sealedPassword: 'c2Vh' };
    await controller.stageImport(org, agent, dto, req);
    expect(backups.stageImport).toHaveBeenCalledWith(org, agent, 'user-1', dto);
  });

  it('reports the running operation', async () => {
    await expect(controller.status(org, agent)).resolves.toBeNull();
    expect(backups.status).toHaveBeenCalledWith(org, agent);
  });

  it('fetches, applies and cancels an import as the calling user', async () => {
    const dto = { mappings: [{ from: session, to: agent }] };

    await controller.plan(org, agent, session, req);
    await controller.apply(org, agent, session, dto, req);
    await controller.cancel(org, agent, session, req);

    expect(backups.getPlan).toHaveBeenCalledWith(org, agent, 'user-1', session);
    expect(backups.applyImport).toHaveBeenCalledWith(org, agent, 'user-1', session, dto);
    expect(backups.cancelImport).toHaveBeenCalledWith(org, agent, 'user-1', session);
  });
});
