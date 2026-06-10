import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';
import { StorageService, StorageInfo } from './storage.service';

describe('StorageController', () => {
  let controller: StorageController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';

  const mockStorageInfo: StorageInfo = {
    originalUsedBytes: 1024,
    originalLimitBytes: 10240,
    transcodedUsedBytes: 512,
    transcodedLimitBytes: 5120,
  };

  beforeEach(async () => {
    service = {
      getStorageInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: service }],
    }).compile();

    controller = module.get<StorageController>(StorageController);
  });

  describe('getStorage', () => {
    it('should call service.getStorageInfo with orgId and return the result', async () => {
      service.getStorageInfo.mockResolvedValue(mockStorageInfo);

      const result = await controller.getStorage(orgId);

      expect(service.getStorageInfo).toHaveBeenCalledWith(orgId);
      expect(result).toEqual(mockStorageInfo);
    });
  });
});
