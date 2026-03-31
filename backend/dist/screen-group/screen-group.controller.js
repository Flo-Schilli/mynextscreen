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
exports.ScreenGroupController = void 0;
const common_1 = require("@nestjs/common");
const screen_group_service_1 = require("./screen-group.service");
const dto_1 = require("./dto");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_organisation_decorator_1 = require("../organisation/current-organisation.decorator");
const organisation_role_enum_1 = require("../user/organisation-role.enum");
let ScreenGroupController = class ScreenGroupController {
    screenGroupService;
    constructor(screenGroupService) {
        this.screenGroupService = screenGroupService;
    }
    create(organisationId, dto, req) {
        return this.screenGroupService.createGroup(organisationId, dto, req.user.userId);
    }
    findAll(organisationId) {
        return this.screenGroupService.findAll(organisationId);
    }
    findOne(organisationId, id) {
        return this.screenGroupService.findOne(organisationId, id);
    }
    update(organisationId, id, dto, req) {
        return this.screenGroupService.updateGroup(organisationId, id, dto, req.user.userId);
    }
    remove(organisationId, id, req) {
        return this.screenGroupService.removeGroup(organisationId, id, req.user.userId);
    }
    assignScreen(organisationId, groupId, screenId, dto, req) {
        return this.screenGroupService.assignScreen(organisationId, groupId, screenId, dto, req.user.userId);
    }
    removeScreen(organisationId, groupId, screenId, req) {
        return this.screenGroupService.removeScreen(organisationId, groupId, screenId, req.user.userId);
    }
};
exports.ScreenGroupController = ScreenGroupController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateScreenGroupDto, Object]),
    __metadata("design:returntype", Promise)
], ScreenGroupController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScreenGroupController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ScreenGroupController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateScreenGroupDto, Object]),
    __metadata("design:returntype", Promise)
], ScreenGroupController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ScreenGroupController.prototype, "remove", null);
__decorate([
    (0, common_1.Put)(':groupId/screens/:screenId'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('groupId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('screenId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, dto_1.AssignScreenDto, Object]),
    __metadata("design:returntype", Promise)
], ScreenGroupController.prototype, "assignScreen", null);
__decorate([
    (0, common_1.Delete)(':groupId/screens/:screenId'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('groupId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('screenId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ScreenGroupController.prototype, "removeScreen", null);
exports.ScreenGroupController = ScreenGroupController = __decorate([
    (0, common_1.Controller)('screen-groups'),
    __metadata("design:paramtypes", [screen_group_service_1.ScreenGroupService])
], ScreenGroupController);
//# sourceMappingURL=screen-group.controller.js.map