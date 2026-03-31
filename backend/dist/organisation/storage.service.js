"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const organisation_entity_1 = require("./organisation.entity");
let StorageService = class StorageService {
    organisationRepository;
    constructor(organisationRepository) {
        this.organisationRepository = organisationRepository;
    }
    async checkOriginalLimit(orgId, additionalBytes) {
        const org = await this.organisationRepository.findOneByOrFail({
            id: orgId,
        });
        const limit = Number(org.storageOriginalLimitBytes);
        if (limit > 0) {
            const newUsage = Number(org.storageOriginalUsedBytes) + additionalBytes;
            if (newUsage > limit) {
                throw new common_1.BadRequestException('Upload would exceed organisation original storage limit');
            }
        }
    }
    async checkTranscodedLimit(orgId, additionalBytes) {
        const org = await this.organisationRepository.findOneByOrFail({
            id: orgId,
        });
        const limit = Number(org.storageTranscodedLimitBytes);
        if (limit > 0) {
            const newUsage = Number(org.storageTranscodedUsedBytes) + additionalBytes;
            if (newUsage > limit) {
                throw new common_1.BadRequestException('Transcoded file would exceed organisation transcoded storage limit');
            }
        }
    }
    async addOriginalUsage(orgId, bytes) {
        const org = await this.organisationRepository.findOneByOrFail({
            id: orgId,
        });
        org.storageOriginalUsedBytes = Number(org.storageOriginalUsedBytes) + bytes;
        await this.organisationRepository.save(org);
    }
    async subtractOriginalUsage(orgId, bytes) {
        const org = await this.organisationRepository.findOneByOrFail({
            id: orgId,
        });
        org.storageOriginalUsedBytes = Math.max(0, Number(org.storageOriginalUsedBytes) - bytes);
        await this.organisationRepository.save(org);
    }
    async addTranscodedUsage(orgId, bytes) {
        const org = await this.organisationRepository.findOneByOrFail({
            id: orgId,
        });
        org.storageTranscodedUsedBytes =
            Number(org.storageTranscodedUsedBytes) + bytes;
        await this.organisationRepository.save(org);
    }
    async subtractTranscodedUsage(orgId, bytes) {
        const org = await this.organisationRepository.findOneByOrFail({
            id: orgId,
        });
        org.storageTranscodedUsedBytes = Math.max(0, Number(org.storageTranscodedUsedBytes) - bytes);
        await this.organisationRepository.save(org);
    }
    async getStorageInfo(orgId) {
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
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(organisation_entity_1.Organisation)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StorageService);
//# sourceMappingURL=storage.service.js.map