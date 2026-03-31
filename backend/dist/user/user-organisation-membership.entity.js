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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserOrganisationMembership = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const user_entity_1 = require("./user.entity");
const organisation_entity_1 = require("../organisation/organisation.entity");
const organisation_role_enum_1 = require("./organisation-role.enum");
let UserOrganisationMembership = class UserOrganisationMembership {
    id;
    userId;
    organisationId;
    role;
    user;
    organisation;
    createdAt;
};
exports.UserOrganisationMembership = UserOrganisationMembership;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserOrganisationMembership.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UserOrganisationMembership.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UserOrganisationMembership.prototype, "organisationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(organisation_role_enum_1.OrganisationRole),
    __metadata("design:type", String)
], UserOrganisationMembership.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (u) => u.memberships, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], UserOrganisationMembership.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organisation_entity_1.Organisation, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'organisationId' }),
    __metadata("design:type", organisation_entity_1.Organisation)
], UserOrganisationMembership.prototype, "organisation", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UserOrganisationMembership.prototype, "createdAt", void 0);
exports.UserOrganisationMembership = UserOrganisationMembership = __decorate([
    (0, typeorm_1.Entity)('user_organisation_memberships'),
    (0, typeorm_1.Unique)('UQ_user_organisation', ['userId', 'organisationId'])
], UserOrganisationMembership);
//# sourceMappingURL=user-organisation-membership.entity.js.map