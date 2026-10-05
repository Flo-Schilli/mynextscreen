import { ConnectionStore, type StoredConnection } from '../connection/connection.store';
import { SetupService } from './setup.service';
import { AutoEnrolmentService } from './auto-enrolment.service';

function connectionStore(stored: StoredConnection | null): ConnectionStore {
  return { load: jest.fn().mockResolvedValue(stored) } as unknown as ConnectionStore;
}

function setupService(enrol: jest.Mock): SetupService {
  return { enrol } as unknown as SetupService;
}

const ENROLLED: StoredConnection = {
  serverUrl: 'https://signage.example.com',
  agentId: 'agent-1',
  organisationId: 'org-1',
  refreshToken: 'refresh',
};

describe('AutoEnrolmentService', () => {
  it('does nothing when MNS_ENROLMENT_TOKEN is not set', async () => {
    const enrol = jest.fn();
    const connections = connectionStore(null);

    await new AutoEnrolmentService(connections, setupService(enrol), null).onApplicationBootstrap();

    expect(enrol).not.toHaveBeenCalled();
    expect(connections.load).not.toHaveBeenCalled();
  });

  it('enrols with the pinned address, never one from the environment', async () => {
    const enrol = jest.fn().mockResolvedValue({ agentId: 'agent-1', organisationId: 'org-1' });

    await new AutoEnrolmentService(
      connectionStore(null),
      setupService(enrol),
      'the-setup-code',
    ).onApplicationBootstrap();

    expect(enrol).toHaveBeenCalledWith(undefined, 'the-setup-code');
  });

  it('skips a stored session rather than spending a code that was already redeemed', async () => {
    const enrol = jest.fn();

    await new AutoEnrolmentService(
      connectionStore(ENROLLED),
      setupService(enrol),
      'the-setup-code',
    ).onApplicationBootstrap();

    expect(enrol).not.toHaveBeenCalled();
  });

  it('keeps the agent running when the code is expired or already used', async () => {
    const enrol = jest.fn().mockRejectedValue(new Error('That setup code has already been used.'));

    await expect(
      new AutoEnrolmentService(
        connectionStore(null),
        setupService(enrol),
        'spent-code',
      ).onApplicationBootstrap(),
    ).resolves.toBeUndefined();

    expect(enrol).toHaveBeenCalledTimes(1);
  });

  it('survives a rejection that is not an Error', async () => {
    const enrol = jest.fn().mockRejectedValue('nope');

    await expect(
      new AutoEnrolmentService(
        connectionStore(null),
        setupService(enrol),
        'code',
      ).onApplicationBootstrap(),
    ).resolves.toBeUndefined();
  });
});
