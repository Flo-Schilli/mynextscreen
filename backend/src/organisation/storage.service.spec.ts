import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { Organisation } from './organisation.entity';

function createMockOrg(overrides: Partial<Organisation> = {}): Organisation {
  const org = new Organisation();
  org.id = 'org-1';
  org.name = 'Test Org';
  org.timeZone = 'UTC';
  org.storageOriginalLimitBytes = 10485760; // 10 MB
  org.storageTranscodedLimitBytes = 10485760;
  org.storageOriginalUsedBytes = 0;
  org.storageTranscodedUsedBytes = 0;
  org.defaultPlaylistId = null;
  Object.assign(org, overrides);
  return org;
}

describe('StorageService', () => {
  let service: StorageService;
  let orgRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    orgRepo = {
      findOneByOrFail: jest.fn().mockResolvedValue(createMockOrg()),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: getRepositoryToken(Organisation), useValue: orgRepo },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('checkOriginalLimit', () => {
    it('should pass when under limit', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({
          storageOriginalUsedBytes: 1000,
          storageOriginalLimitBytes: 10485760,
        }),
      );

      await expect(
        service.checkOriginalLimit('org-1', 5000),
      ).resolves.toBeUndefined();
    });

    it('should throw when limit would be exceeded', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({
          storageOriginalUsedBytes: 10485000,
          storageOriginalLimitBytes: 10485760,
        }),
      );

      await expect(service.checkOriginalLimit('org-1', 1000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow unlimited when limit is 0', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({ storageOriginalLimitBytes: 0 }),
      );

      await expect(
        service.checkOriginalLimit('org-1', 999999999),
      ).resolves.toBeUndefined();
    });
  });

  describe('checkTranscodedLimit', () => {
    it('should pass when under limit', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({
          storageTranscodedUsedBytes: 1000,
          storageTranscodedLimitBytes: 10485760,
        }),
      );

      await expect(
        service.checkTranscodedLimit('org-1', 5000),
      ).resolves.toBeUndefined();
    });

    it('should throw when limit would be exceeded', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({
          storageTranscodedUsedBytes: 10485000,
          storageTranscodedLimitBytes: 10485760,
        }),
      );

      await expect(service.checkTranscodedLimit('org-1', 1000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow unlimited when limit is 0', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({ storageTranscodedLimitBytes: 0 }),
      );

      await expect(
        service.checkTranscodedLimit('org-1', 999999999),
      ).resolves.toBeUndefined();
    });
  });

  describe('addOriginalUsage', () => {
    it('should increment original usage', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({ storageOriginalUsedBytes: 1000 }),
      );

      await service.addOriginalUsage('org-1', 5000);

      expect(orgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ storageOriginalUsedBytes: 6000 }),
      );
    });
  });

  describe('subtractOriginalUsage', () => {
    it('should decrement original usage', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({ storageOriginalUsedBytes: 5000 }),
      );

      await service.subtractOriginalUsage('org-1', 3000);

      expect(orgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ storageOriginalUsedBytes: 2000 }),
      );
    });

    it('should not go below zero', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({ storageOriginalUsedBytes: 1000 }),
      );

      await service.subtractOriginalUsage('org-1', 5000);

      expect(orgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ storageOriginalUsedBytes: 0 }),
      );
    });
  });

  describe('addTranscodedUsage', () => {
    it('should increment transcoded usage', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({ storageTranscodedUsedBytes: 2000 }),
      );

      await service.addTranscodedUsage('org-1', 3000);

      expect(orgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ storageTranscodedUsedBytes: 5000 }),
      );
    });
  });

  describe('subtractTranscodedUsage', () => {
    it('should decrement transcoded usage', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({ storageTranscodedUsedBytes: 5000 }),
      );

      await service.subtractTranscodedUsage('org-1', 2000);

      expect(orgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ storageTranscodedUsedBytes: 3000 }),
      );
    });

    it('should not go below zero', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({ storageTranscodedUsedBytes: 1000 }),
      );

      await service.subtractTranscodedUsage('org-1', 5000);

      expect(orgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ storageTranscodedUsedBytes: 0 }),
      );
    });
  });

  describe('getStorageInfo', () => {
    it('should return current usage and limits', async () => {
      orgRepo.findOneByOrFail.mockResolvedValue(
        createMockOrg({
          storageOriginalUsedBytes: 5000,
          storageOriginalLimitBytes: 10485760,
          storageTranscodedUsedBytes: 3000,
          storageTranscodedLimitBytes: 20971520,
        }),
      );

      const info = await service.getStorageInfo('org-1');

      expect(info).toEqual({
        originalUsedBytes: 5000,
        originalLimitBytes: 10485760,
        transcodedUsedBytes: 3000,
        transcodedLimitBytes: 20971520,
      });
    });
  });
});
