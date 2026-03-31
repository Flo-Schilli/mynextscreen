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
exports.ScheduleEntry = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const organisation_entity_1 = require("../organisation/organisation.entity");
const screen_entity_1 = require("../screen/screen.entity");
const playlist_entity_1 = require("../playlist/playlist.entity");
const screen_group_entity_1 = require("../screen-group/screen-group.entity");
let ScheduleEntry = class ScheduleEntry {
    id;
    organisationId;
    organisation;
    screenId;
    screen;
    groupId;
    group;
    playlistId;
    playlist;
    startTime;
    endTime;
    rrule;
    colour;
    createdAt;
    updatedAt;
    get targetType() {
        return this.groupId ? 'group' : 'screen';
    }
    get targetId() {
        return this.groupId ?? this.screenId;
    }
};
exports.ScheduleEntry = ScheduleEntry;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ScheduleEntry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleEntry.prototype, "organisationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organisation_entity_1.Organisation, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'organisationId' }),
    __metadata("design:type", organisation_entity_1.Organisation)
], ScheduleEntry.prototype, "organisation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ScheduleEntry.prototype, "screenId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => screen_entity_1.Screen, { onDelete: 'CASCADE', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'screenId' }),
    __metadata("design:type", Object)
], ScheduleEntry.prototype, "screen", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ScheduleEntry.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => screen_group_entity_1.ScreenGroup, { onDelete: 'CASCADE', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'groupId' }),
    __metadata("design:type", Object)
], ScheduleEntry.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleEntry.prototype, "playlistId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => playlist_entity_1.Playlist, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'playlistId' }),
    __metadata("design:type", playlist_entity_1.Playlist)
], ScheduleEntry.prototype, "playlist", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: false }),
    __metadata("design:type", Date)
], ScheduleEntry.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: false }),
    __metadata("design:type", Date)
], ScheduleEntry.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ScheduleEntry.prototype, "rrule", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^#[0-9a-fA-F]{6}$/, {
        message: 'colour must be a hex colour (e.g. #FF5733)',
    }),
    __metadata("design:type", String)
], ScheduleEntry.prototype, "colour", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ScheduleEntry.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ScheduleEntry.prototype, "updatedAt", void 0);
exports.ScheduleEntry = ScheduleEntry = __decorate([
    (0, typeorm_1.Entity)('schedule_entries')
], ScheduleEntry);
//# sourceMappingURL=schedule-entry.entity.js.map