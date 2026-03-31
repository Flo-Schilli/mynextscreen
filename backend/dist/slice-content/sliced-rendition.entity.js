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
exports.SlicedRendition = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const organisation_entity_1 = require("../organisation/organisation.entity");
const screen_group_entity_1 = require("../screen-group/screen-group.entity");
const screen_entity_1 = require("../screen/screen.entity");
const content_entity_1 = require("../content/content.entity");
let SlicedRendition = class SlicedRendition {
    id;
    organisationId;
    organisation;
    groupId;
    group;
    screenId;
    screen;
    contentItemId;
    content;
    filePath;
    sourceHash;
    createdAt;
    updatedAt;
};
exports.SlicedRendition = SlicedRendition;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SlicedRendition.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SlicedRendition.prototype, "organisationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organisation_entity_1.Organisation, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'organisationId' }),
    __metadata("design:type", organisation_entity_1.Organisation)
], SlicedRendition.prototype, "organisation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SlicedRendition.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => screen_group_entity_1.ScreenGroup, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'groupId' }),
    __metadata("design:type", screen_group_entity_1.ScreenGroup)
], SlicedRendition.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SlicedRendition.prototype, "screenId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => screen_entity_1.Screen, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'screenId' }),
    __metadata("design:type", screen_entity_1.Screen)
], SlicedRendition.prototype, "screen", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SlicedRendition.prototype, "contentItemId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => content_entity_1.Content, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'contentItemId' }),
    __metadata("design:type", content_entity_1.Content)
], SlicedRendition.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SlicedRendition.prototype, "filePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SlicedRendition.prototype, "sourceHash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SlicedRendition.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SlicedRendition.prototype, "updatedAt", void 0);
exports.SlicedRendition = SlicedRendition = __decorate([
    (0, typeorm_1.Entity)('sliced_renditions')
], SlicedRendition);
//# sourceMappingURL=sliced-rendition.entity.js.map