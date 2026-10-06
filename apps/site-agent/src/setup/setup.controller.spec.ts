import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';
import { SetupAuthGuard } from './setup-auth.guard';
import { IS_SETUP_PUBLIC_KEY } from './setup-public.decorator';

describe('SetupController', () => {
  let controller: SetupController;
  let setup: Record<string, jest.Mock>;

  const status = {
    connected: false,
    serverUrl: null,
    agentId: null,
    organisationId: null,
    screenCount: 0,
    lastConfigPullAt: null,
    agentVersion: '1.2.3',
  };

  beforeEach(async () => {
    setup = {
      status: jest.fn().mockResolvedValue(status),
      enrol: jest.fn().mockResolvedValue(status),
      reset: jest.fn().mockResolvedValue(status),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetupController],
      providers: [{ provide: SetupService, useValue: setup }],
    })
      .overrideGuard(SetupAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SetupController);
  });

  describe('access', () => {
    const reflector = new Reflector();

    // These carry no secret, so requiring a code for them would stop an operator
    // seeing whether the agent is connected. Enrol is public too: its own
    // single-use token is the credential, so there is no second gate to add.
    it.each(['page', 'status', 'enrol'] as const)('%s needs no setup code', (method) => {
      expect(reflector.get<boolean>(IS_SETUP_PUBLIC_KEY, SetupController.prototype[method])).toBe(
        true,
      );
    });

    // Reset ends a running agent's session, which is the thing worth guarding
    // behind a fresh dashboard-issued code.
    it('reset requires a setup code', () => {
      expect(
        reflector.get<boolean>(IS_SETUP_PUBLIC_KEY, SetupController.prototype.reset),
      ).toBeUndefined();
    });
  });

  describe('page', () => {
    it('serves the setup page', async () => {
      const html = await controller.page();

      expect(html).toContain('<title>myNextScreen Site Agent</title>');
    });
  });

  describe('status', () => {
    it('returns what the service reports', async () => {
      expect(await controller.status()).toEqual(status);
    });
  });

  describe('enrol', () => {
    it('passes the address and token through', async () => {
      await controller.enrol({
        serverUrl: 'https://signage.example.com',
        enrolmentToken: 'token',
      });

      expect(setup.enrol).toHaveBeenCalledWith('https://signage.example.com', 'token');
    });

    it('never echoes the token back', async () => {
      const result = await controller.enrol({
        serverUrl: 'https://signage.example.com',
        enrolmentToken: 'token',
      });

      expect(JSON.stringify(result)).not.toContain('token');
    });
  });

  describe('reset', () => {
    it('passes the setup code from the header through to the service', async () => {
      await controller.reset('fresh-code');

      expect(setup.reset).toHaveBeenCalledWith('fresh-code');
    });
  });
});
