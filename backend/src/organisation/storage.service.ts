import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organisation } from './organisation.entity';

export interface StorageInfo {
  originalUsedBytes: number;
  originalLimitBytes: number;
  transcodedUsedBytes: number;
  transcodedLimitBytes: number;
}

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
  ) {}

  async checkOriginalLimit(
    orgId: string,
    additionalBytes: number,
  ): Promise<void> {
    const org = await this.organisationRepository.findOneByOrFail({
      id: orgId,
    });
    const limit = Number(org.storageOriginalLimitBytes);
    if (limit > 0) {
      const newUsage = Number(org.storageOriginalUsedBytes) + additionalBytes;
      if (newUsage > limit) {
        throw new BadRequestException(
          'Upload would exceed organisation original storage limit',
        );
      }
    }
  }

  async checkTranscodedLimit(
    orgId: string,
    additionalBytes: number,
  ): Promise<void> {
    const org = await this.organisationRepository.findOneByOrFail({
      id: orgId,
    });
    const limit = Number(org.storageTranscodedLimitBytes);
    if (limit > 0) {
      const newUsage = Number(org.storageTranscodedUsedBytes) + additionalBytes;
      if (newUsage > limit) {
        throw new BadRequestException(
          'Transcoded file would exceed organisation transcoded storage limit',
        );
      }
    }
  }

  async addOriginalUsage(orgId: string, bytes: number): Promise<void> {
    const org = await this.organisationRepository.findOneByOrFail({
      id: orgId,
    });
    org.storageOriginalUsedBytes = Number(org.storageOriginalUsedBytes) + bytes;
    await this.organisationRepository.save(org);
  }

  async subtractOriginalUsage(orgId: string, bytes: number): Promise<void> {
    const org = await this.organisationRepository.findOneByOrFail({
      id: orgId,
    });
    org.storageOriginalUsedBytes = Math.max(
      0,
      Number(org.storageOriginalUsedBytes) - bytes,
    );
    await this.organisationRepository.save(org);
  }

  async addTranscodedUsage(orgId: string, bytes: number): Promise<void> {
    const org = await this.organisationRepository.findOneByOrFail({
      id: orgId,
    });
    org.storageTranscodedUsedBytes =
      Number(org.storageTranscodedUsedBytes) + bytes;
    await this.organisationRepository.save(org);
  }

  async subtractTranscodedUsage(orgId: string, bytes: number): Promise<void> {
    const org = await this.organisationRepository.findOneByOrFail({
      id: orgId,
    });
    org.storageTranscodedUsedBytes = Math.max(
      0,
      Number(org.storageTranscodedUsedBytes) - bytes,
    );
    await this.organisationRepository.save(org);
  }

  async getStorageInfo(orgId: string): Promise<StorageInfo> {
    const org = await this.organisationRepository.findOneByOrFail({
      id: orgId,
    });
    return {
      originalUsedBytes: Number(org.storageOriginalUsedBytes),
      originalLimitBytes: Number(org.storageOriginalLimitBytes),
      transcodedUsedBytes: Number(org.storageTranscodedUsedBytes),
      transcodedLimitBytes: Number(org.storageTranscodedLimitBytes),
    };
  }
}
