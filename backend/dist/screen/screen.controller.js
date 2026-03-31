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
exports.ScreenController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const screen_service_1 = require("./screen.service");
const screen_state_service_1 = require("./screen-state.service");
const dto_1 = require("./dto");
const roles_decorator_1 = require("../auth/roles.decorator");
const auth_1 = require("../auth");
const current_organisation_decorator_1 = require("../organisation/current-organisation.decorator");
const organisation_role_enum_1 = require("../user/organisation-role.enum");
let ScreenController = class ScreenController {
    screenService;
    screenStateService;
    constructor(screenService, screenStateService) {
        this.screenService = screenService;
        this.screenStateService = screenStateService;
    }
    create(organisationId, dto) {
        return this.screenService.createScreen(organisationId, dto);
    }
    findAll(organisationId) {
        return this.screenService.findAll(organisationId);
    }
    findOne(organisationId, id) {
        return this.screenService.findOne(organisationId, id);
    }
    update(organisationId, id, dto) {
        return this.screenService.updateScreen(organisationId, id, dto);
    }
    regenerateKey(organisationId, id) {
        return this.screenService.regenerateApiKey(organisationId, id);
    }
    getState(req, id) {
        return this.screenStateService.getRenderedState(req.organisationId, id);
    }
    events(req, id) {
        void this.screenService.findOne(req.organisationId, id);
        return this.screenStateService.subscribe(id);
    }
    heartbeat(req, id) {
        return this.screenService.recordHeartbeat(req.organisationId, id);
    }
};
exports.ScreenController = ScreenController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateScreenDto]),
    __metadata("design:returntype", Promise)
], ScreenController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScreenController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ScreenController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateScreenDto]),
    __metadata("design:returntype", Promise)
], ScreenController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/regenerate-key'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ScreenController.prototype, "regenerateKey", null);
__decorate([
    (0, common_1.Get)(':id/state'),
    (0, auth_1.ScreenAuth)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ScreenController.prototype, "getState", null);
__decorate([
    (0, common_1.Sse)(':id/events'),
    (0, auth_1.ScreenAuth)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", rxjs_1.Observable)
], ScreenController.prototype, "events", null);
__decorate([
    (0, common_1.Post)(':id/heartbeat'),
    (0, auth_1.ScreenAuth)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ScreenController.prototype, "heartbeat", null);
exports.ScreenController = ScreenController = __decorate([
    (0, common_1.Controller)('screens'),
    __metadata("design:paramtypes", [screen_service_1.ScreenService,
        screen_state_service_1.ScreenStateService])
], ScreenController);
//# sourceMappingURL=screen.controller.js.map