import { SiteAgentBackupDeviceController } from './site-agent-backup-device.controller';
import type { AgentAuthenticatedRequest } from '../auth/agent-auth.guard';

describe('SiteAgentBackupDeviceController', () => {
  const id = '33333333-3333-4333-8333-333333333333';
  const req = { agentId: 'agent-1', organisationId: 'org-1' } as AgentAuthenticatedRequest;
  let backups: Record<string, jest.Mock>;
  let controller: SiteAgentBackupDeviceController;

  beforeEach(() => {
    backups = {
      receiveExport: jest.fn().mockResolvedValue(undefined),
      receiveImportKey: jest.fn().mockResolvedValue(undefined),
      fetchImport: jest.fn().mockResolvedValue({ backup: 'b', sealedPassword: 's' }),
      receiveAnalysis: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue({ assignments: [], skipped: [] }),
      receiveImportResult: jest.fn().mockResolvedValue(undefined),
    };
    controller = new SiteAgentBackupDeviceController(backups as never);
  });

  it('binds every call to the calling agent', async () => {
    await controller.receiveExport(req, id, { error: 'x' });
    await controller.receiveImportKey(req, id, { publicKey: 'PUB' });
    await controller.fetchImport(req, id);
    await controller.receiveAnalysis(req, id, { sourceAgentId: id, entries: [] });
    await controller.restore(req, id, { sourceAgentId: id, screens: [] });
    await controller.receiveImportResult(req, id, { error: 'x' });

    for (const method of Object.values(backups)) {
      expect(method).toHaveBeenCalledWith(
        'agent-1',
        id,
        ...(method === backups.fetchImport ? [] : [expect.anything()]),
      );
    }
  });
});
