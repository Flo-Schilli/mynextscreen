import { StorageService, StorageInfo } from './storage.service';
export declare class StorageController {
    private readonly storageService;
    constructor(storageService: StorageService);
    getStorage(orgId: string): Promise<StorageInfo>;
}
