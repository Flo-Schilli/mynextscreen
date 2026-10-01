import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ScreenRemoteControlController } from './screen-remote-control.controller';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import { ScreenRemoteCommandService } from './screen-remote-command.service';
import { SiteAgentCommandType } from './site-agent-command.enum';
import { REMOTE_CONTROL_DEFAULTS } from './screen-remote-control.service';
import { MASKED_SECRET } from './screen-remote-control.dto-mapper';
import { ROLES_KEY } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import type { ScreenRemoteControl } from '../db/schema';

describe('ScreenRemoteControlController', () => {
  let controller: ScreenRemoteControlController;
  let service: Record<string, jest.Mock>;
  let commands: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const screenId = '770e8400-e29b-41d4-a716-446655440000';
  const userId = '880e8400-e29b-41d4-a716-446655440000';
  const mockReq = { user: { userId, email: 'admin@example.com' } } as AuthenticatedRequest;

  function rowWith(overrides: Partial<ScreenRemoteControl> = {}): ScreenRemoteControl {
    return {
      screenId,
      organisationId: orgId,
      ...REMOTE_CONTROL_DEFAULTS,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as ScreenRemoteControl;
  }

  beforeEach(async () => {
    service = { getForScreen: jest.fn(), upsert: jest.fn() };
    commands = { dispatchManual: jest.fn(), dispatchCheck: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreenRemoteControlController],
      providers: [
        { provide: ScreenRemoteControlService, useValue: service },
        { provide: ScreenRemoteCommandService, useValue: commands },
      ],
    }).compile();

    controller = module.get(ScreenRemoteControlController);
  });

  describe('access declarations', () => {
    const reflector = new Reflector();

    // Remote control hands out SSH reach into the venue; an Editor managing
    // playlists has no business changing it.
    it.each(['get', 'update', 'command', 'check'] as const)(
      'restricts %s to org admins',
      (method) => {
        expect(
          reflector.get<string[]>(ROLES_KEY, ScreenRemoteControlController.prototype[method]),
        ).toEqual([OrganisationRole.OrgAdmin]);
      },
    );
  });

  describe('masking', () => {
    it('never returns the stored passphrase on read', async () => {
      service.getForScreen.mockResolvedValue(rowWith({ devmodePassphrase: 'AEBC72' }));

      const result = await controller.get(orgId, screenId);

      expect(result.devmodePassphrase).toBe(MASKED_SECRET);
      expect(JSON.stringify(result)).not.toContain('AEBC72');
    });

    // The write response is the easier one to forget, and it is the one that
    // carries the value the caller just sent.
    it('never echoes the passphrase back on write', async () => {
      service.upsert.mockResolvedValue(rowWith({ devmodePassphrase: 'AEBC72' }));

      const result = await controller.update(
        orgId,
        screenId,
        { devmodePassphrase: 'AEBC72' },
        mockReq,
      );

      expect(result.devmodePassphrase).toBe(MASKED_SECRET);
      expect(JSON.stringify(result)).not.toContain('AEBC72');
    });

    it('reports null rather than a mask when none is stored', async () => {
      service.getForScreen.mockResolvedValue(rowWith({ devmodePassphrase: null }));

      const result = await controller.get(orgId, screenId);

      expect(result.devmodePassphrase).toBeNull();
    });

    it('passes every non-secret field through untouched', async () => {
      service.getForScreen.mockResolvedValue(
        rowWith({ localIp: '192.168.1.50', macAddress: 'AA:BB:CC:DD:EE:FF', ssapPort: 3000 }),
      );

      const result = await controller.get(orgId, screenId);

      expect(result.localIp).toBe('192.168.1.50');
      expect(result.macAddress).toBe('AA:BB:CC:DD:EE:FF');
      expect(result.ssapPort).toBe(3000);
    });
  });

  describe('delegation', () => {
    it('scopes the read to the organisation from the header', async () => {
      service.getForScreen.mockResolvedValue(rowWith());

      await controller.get(orgId, screenId);

      expect(service.getForScreen).toHaveBeenCalledWith(orgId, screenId);
    });

    it('forwards the acting user so the change is attributable', async () => {
      service.upsert.mockResolvedValue(rowWith());

      await controller.update(orgId, screenId, { localIp: '10.0.0.5' }, mockReq);

      expect(service.upsert).toHaveBeenCalledWith(orgId, screenId, { localIp: '10.0.0.5' }, userId);
    });
  });

  describe('command', () => {
    it('dispatches the requested action with the acting user', async () => {
      commands.dispatchManual.mockResolvedValue({ commandId: 'cmd-1' });

      const result = await controller.command(
        orgId,
        screenId,
        { type: SiteAgentCommandType.Launch },
        mockReq,
      );

      expect(result).toEqual({ commandId: 'cmd-1' });
      expect(commands.dispatchManual).toHaveBeenCalledWith(
        orgId,
        screenId,
        SiteAgentCommandType.Launch,
        userId,
      );
    });
  });

  describe('check', () => {
    it('passes the wizard step through', async () => {
      commands.dispatchCheck.mockResolvedValue({ commandId: 'cmd-2' });

      const result = await controller.check(orgId, screenId, { step: 5 });

      expect(result).toEqual({ commandId: 'cmd-2' });
      expect(commands.dispatchCheck).toHaveBeenCalledWith(orgId, screenId, 5);
    });
  });
});
