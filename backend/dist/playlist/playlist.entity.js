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
exports.Playlist = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const organisation_entity_1 = require("../organisation/organisation.entity");
const playlist_item_entity_1 = require("./playlist-item.entity");
let Playlist = class Playlist {
    id;
    organisationId;
    organisation;
    name;
    items;
    createdAt;
    updatedAt;
};
exports.Playlist = Playlist;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Playlist.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Playlist.prototype, "organisationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organisation_entity_1.Organisation, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'organisationId' }),
    __metadata("design:type", organisation_entity_1.Organisation)
], Playlist.prototype, "organisation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Playlist.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => playlist_item_entity_1.PlaylistItem, (item) => item.playlist),
    __metadata("design:type", Array)
], Playlist.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Playlist.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Playlist.prototype, "updatedAt", void 0);
exports.Playlist = Playlist = __decorate([
    (0, typeorm_1.Entity)('playlists')
], Playlist);
//# sourceMappingURL=playlist.entity.js.map