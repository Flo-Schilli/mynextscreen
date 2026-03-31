import { Repository } from 'typeorm';
import { Organisation } from './organisation.entity';
export interface StorageInfo {
    originalUsedBytes: number;
    originalLimitBytes: number;
    transcodedUsedBytes: number;
    transcodedLimitBytes: number;
}
export declare class StorageService {
    private readonly organisationRepository;
    constructor(organisationRepository: Repository<Organisation>);
    checkOriginalLimit(orgId: string, additionalBytes: number): Promise<void>;
    checkTranscodedLimit(orgId: string, additionalBytes: number): Promise<void>;
    addOriginalUsage(orgId: string, bytes: number): Promise<void>;
    subtractOriginalUsage(orgId: string, bytes: number): Promise<void>;
    addTranscodedUsage(orgId: string, bytes: number): Promise<void>;
    subtractTranscodedUsage(orgId: string, bytes: number): Promise<void>;
    getStorageInfo(orgId: string): Promise<StorageInfo>;
}
