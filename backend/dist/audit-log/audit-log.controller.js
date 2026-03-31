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
exports.AdminAuditLogController = exports.AuditLogController = void 0;
const common_1 = require("@nestjs/common");
const audit_log_service_1 = require("./audit-log.service");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_organisation_decorator_1 = require("../organisation/current-organisation.decorator");
const super_admin_guard_1 = require("../auth/super-admin.guard");
const organisation_role_enum_1 = require("../user/organisation-role.enum");
const audit_log_query_dto_1 = require("./audit-log-query.dto");
function buildFilters(query) {
    const filters = {};
    if (query.action) {
        filters.action = query.action;
    }
    if (query.userId) {
        filters.userId = query.userId;
    }
    if (query.resourceType) {
        filters.resourceType = query.resourceType;
    }
    if (query.resourceId) {
        filters.resourceId = query.resourceId;
    }
    if (query.from) {
        filters.from = new Date(query.from);
    }
    if (query.to) {
        filters.to = new Date(query.to);
    }
    const limit = query.limit ? Math.min(Number(query.limit), 200) : 50;
    filters.limit = limit;
    filters.offset = query.offset ? Number(query.offset) : 0;
    return filters;
}
let AuditLogController = class AuditLogController {
    auditLogService;
    constructor(auditLogService) {
        this.auditLogService = auditLogService;
    }
    findByOrganisation(organisationId, query) {
        return this.auditLogService.findByOrganisation(organisationId, buildFilters(query));
    }
};
exports.AuditLogController = AuditLogController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, audit_log_query_dto_1.AuditLogQueryDto]),
    __metadata("design:returntype", Promise)
], AuditLogController.prototype, "findByOrganisation", null);
exports.AuditLogController = AuditLogController = __decorate([
    (0, common_1.Controller)('audit-log'),
    __metadata("design:paramtypes", [audit_log_service_1.AuditLogService])
], AuditLogController);
let AdminAuditLogController = class AdminAuditLogController {
    auditLogService;
    constructor(auditLogService) {
        this.auditLogService = auditLogService;
    }
    findAll(query) {
        const filters = buildFilters(query);
        if (query.organisationId) {
            return this.auditLogService.findByOrganisation(query.organisationId, filters);
        }
        return this.auditLogService.findAll(filters);
    }
};
exports.AdminAuditLogController = AdminAuditLogController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_log_query_dto_1.AdminAuditLogQueryDto]),
    __metadata("design:returntype", Promise)
], AdminAuditLogController.prototype, "findAll", null);
exports.AdminAuditLogController = AdminAuditLogController = __decorate([
    (0, common_1.Controller)('admin/audit-log'),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    __metadata("design:paramtypes", [audit_log_service_1.AuditLogService])
], AdminAuditLogController);
//# sourceMappingURL=audit-log.controller.js.map