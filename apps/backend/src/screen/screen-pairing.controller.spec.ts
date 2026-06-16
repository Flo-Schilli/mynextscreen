import { Test, TestingModule } from '@nestjs/testing';
import { ScreenPairingController } from './screen-pairing.controller';
import { ScreenPairingService } from './screen-pairing.service';

describe('ScreenPairingController', () => {
  let controller: ScreenPairingController;
  let service: Record<string, jest.Mock>;

  const pairingId = '770e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    service = {
      startPairing: jest.fn(),
      getStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreenPairingController],
      providers: [{ provide: ScreenPairingService, useValue: service }],
    }).compile();

    controller = module.get<ScreenPairingController>(ScreenPairingController);
  });

  describe('start', () => {
    it('delegates to the service and returns the started pairing', async () => {
      const started = {
        pairingId,
        code: '123456',
        expiresAt: new Date(),
        pairingSecret: 'raw-secret',
      };
      service.startPairing.mockResolvedValue(started);

      const result = await controller.start();

      expect(service.startPairing).toHaveBeenCalled();
      expect(result).toEqual(started);
    });
  });

  describe('status', () => {
    it('passes the id and the X-Pairing-Secret header to the service', async () => {
      service.getStatus.mockResolvedValue({ status: 'pending' });

      const result = await controller.status(pairingId, 'raw-secret');

      expect(service.getStatus).toHaveBeenCalledWith(pairingId, 'raw-secret');
      expect(result).toEqual({ status: 'pending' });
    });

    it('forwards an undefined secret when the header is absent', async () => {
      service.getStatus.mockResolvedValue({ status: 'pending' });

      await controller.status(pairingId, undefined);

      expect(service.getStatus).toHaveBeenCalledWith(pairingId, undefined);
    });
  });
});
