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
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_entry_entity_1 = require("./audit-entry.entity");
let AuditLogService = class AuditLogService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async record(entry) {
        const auditEntry = this.repository.create(entry);
        return this.repository.save(auditEntry);
    }
    async findByOrganisation(organisationId, filters = {}) {
        const where = this.buildWhere({ ...filters, organisationId });
        return this.query(where, filters);
    }
    async findAll(filters = {}) {
        const where = this.buildWhere(filters);
        return this.query(where, filters);
    }
    async query(where, filters) {
        const take = filters.limit ?? 50;
        const skip = filters.offset ?? 0;
        const [data, total] = await this.repository.findAndCount({
            where,
            order: { timestamp: 'DESC' },
            take,
            skip,
        });
        return { data, total };
    }
    buildWhere(filters) {
        const where = {};
        if (filters.organisationId) {
            where.organisationId = filters.organisationId;
        }
        if (filters.action) {
            where.action = filters.action;
        }
        if (filters.userId) {
            where.userId = filters.userId;
        }
        if (filters.resourceType) {
            where.resourceType = filters.resourceType;
        }
        if (filters.resourceId) {
            where.resourceId = filters.resourceId;
        }
        if (filters.from && filters.to) {
            where.timestamp = (0, typeorm_2.Between)(filters.from, filters.to);
        }
        else if (filters.from) {
            where.timestamp = (0, typeorm_2.MoreThanOrEqual)(filters.from);
        }
        else if (filters.to) {
            where.timestamp = (0, typeorm_2.LessThanOrEqual)(filters.to);
        }
        return where;
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_entry_entity_1.AuditEntry)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditLogService);
//# sourceMappingURL=audit-log.service.js.map