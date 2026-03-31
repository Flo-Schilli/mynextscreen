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
exports.MembershipController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/roles.decorator");
const organisation_role_enum_1 = require("./organisation-role.enum");
const membership_service_1 = require("./membership.service");
const dto_1 = require("./dto");
let MembershipController = class MembershipController {
    membershipService;
    constructor(membershipService) {
        this.membershipService = membershipService;
    }
    listMembers(orgId) {
        return this.membershipService.listMembers(orgId);
    }
    addMember(orgId, dto) {
        return this.membershipService.addMember(orgId, dto.email, dto.role);
    }
    updateRole(orgId, userId, dto) {
        return this.membershipService.updateRole(orgId, userId, dto.role);
    }
    removeMember(orgId, userId) {
        return this.membershipService.removeMember(orgId, userId);
    }
};
exports.MembershipController = MembershipController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('orgId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "listMembers", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AddMemberDto]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "addMember", null);
__decorate([
    (0, common_1.Patch)(':userId'),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateMemberRoleDto]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Delete)(':userId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "removeMember", null);
exports.MembershipController = MembershipController = __decorate([
    (0, common_1.Controller)('organisations/:orgId/members'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __metadata("design:paramtypes", [membership_service_1.MembershipService])
], MembershipController);
//# sourceMappingURL=membership.controller.js.map