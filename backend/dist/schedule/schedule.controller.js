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
exports.ScheduleController = void 0;
const common_1 = require("@nestjs/common");
const schedule_service_1 = require("./schedule.service");
const create_schedule_entry_dto_1 = require("./dto/create-schedule-entry.dto");
const update_schedule_entry_dto_1 = require("./dto/update-schedule-entry.dto");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_organisation_decorator_1 = require("../organisation/current-organisation.decorator");
const organisation_role_enum_1 = require("../user/organisation-role.enum");
let ScheduleController = class ScheduleController {
    scheduleService;
    constructor(scheduleService) {
        this.scheduleService = scheduleService;
    }
    create(organisationId, dto) {
        return this.scheduleService.create(organisationId, dto);
    }
    async find(organisationId, screenId, from, to) {
        const fromDate = from ? new Date(from) : new Date();
        const toDate = to
            ? new Date(to)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        let entries;
        if (screenId) {
            entries = await this.scheduleService.findByScreen(screenId, organisationId, fromDate, toDate);
        }
        else {
            entries = await this.scheduleService.findByOrganisation(organisationId, fromDate, toDate);
        }
        return entries.map((entry) => ({
            ...entry,
            targetType: entry.targetType,
            targetId: entry.targetId,
        }));
    }
    getCurrentPlaylist(screenId) {
        return this.scheduleService.getCurrentPlaylist(screenId);
    }
    update(organisationId, id, dto) {
        return this.scheduleService.update(id, organisationId, dto);
    }
    delete(organisationId, id) {
        return this.scheduleService.delete(id, organisationId);
    }
};
exports.ScheduleController = ScheduleController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_schedule_entry_dto_1.CreateScheduleEntryDto]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Query)('screenId')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "find", null);
__decorate([
    (0, common_1.Get)('current'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, common_1.Query)('screenId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "getCurrentPlaylist", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_schedule_entry_dto_1.UpdateScheduleEntryDto]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "delete", null);
exports.ScheduleController = ScheduleController = __decorate([
    (0, common_1.Controller)('schedules'),
    __metadata("design:paramtypes", [schedule_service_1.ScheduleService])
], ScheduleController);
//# sourceMappingURL=schedule.controller.js.map