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
exports.ScreenGroup = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const organisation_entity_1 = require("../organisation/organisation.entity");
const screen_entity_1 = require("../screen/screen.entity");
const screen_group_mode_enum_1 = require("./screen-group-mode.enum");
let ScreenGroup = class ScreenGroup {
    id;
    organisationId;
    organisation;
    name;
    mode;
    gridColumns;
    gridRows;
    screens;
    createdAt;
    updatedAt;
};
exports.ScreenGroup = ScreenGroup;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ScreenGroup.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScreenGroup.prototype, "organisationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organisation_entity_1.Organisation, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'organisationId' }),
    __metadata("design:type", organisation_entity_1.Organisation)
], ScreenGroup.prototype, "organisation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScreenGroup.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false, default: screen_group_mode_enum_1.ScreenGroupMode.Mirror }),
    (0, class_validator_1.IsEnum)(screen_group_mode_enum_1.ScreenGroupMode),
    __metadata("design:type", String)
], ScreenGroup.prototype, "mode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], ScreenGroup.prototype, "gridColumns", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], ScreenGroup.prototype, "gridRows", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => screen_entity_1.Screen, (screen) => screen.group),
    __metadata("design:type", Array)
], ScreenGroup.prototype, "screens", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ScreenGroup.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ScreenGroup.prototype, "updatedAt", void 0);
exports.ScreenGroup = ScreenGroup = __decorate([
    (0, typeorm_1.Entity)('screen_groups')
], ScreenGroup);
//# sourceMappingURL=screen-group.entity.js.map