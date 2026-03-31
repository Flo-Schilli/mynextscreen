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
exports.OrganisationController = void 0;
const common_1 = require("@nestjs/common");
const super_admin_guard_1 = require("../auth/super-admin.guard");
const organisation_service_1 = require("./organisation.service");
const dto_1 = require("./dto");
let OrganisationController = class OrganisationController {
    organisationService;
    constructor(organisationService) {
        this.organisationService = organisationService;
    }
    create(dto) {
        return this.organisationService.create(dto);
    }
    findAll() {
        return this.organisationService.findAll();
    }
    findOne(id) {
        return this.organisationService.findOne(id);
    }
    update(id, dto) {
        return this.organisationService.update(id, dto);
    }
};
exports.OrganisationController = OrganisationController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateOrganisationDto]),
    __metadata("design:returntype", Promise)
], OrganisationController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrganisationController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganisationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateOrganisationDto]),
    __metadata("design:returntype", Promise)
], OrganisationController.prototype, "update", null);
exports.OrganisationController = OrganisationController = __decorate([
    (0, common_1.Controller)('organisations'),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    __metadata("design:paramtypes", [organisation_service_1.OrganisationService])
], OrganisationController);
//# sourceMappingURL=organisation.controller.js.map