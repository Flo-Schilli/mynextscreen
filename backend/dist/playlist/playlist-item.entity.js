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
exports.PlaylistItem = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const playlist_entity_1 = require("./playlist.entity");
const content_entity_1 = require("../content/content.entity");
let PlaylistItem = class PlaylistItem {
    id;
    playlistId;
    playlist;
    contentId;
    content;
    position;
    durationSeconds;
};
exports.PlaylistItem = PlaylistItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PlaylistItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlaylistItem.prototype, "playlistId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => playlist_entity_1.Playlist, (playlist) => playlist.items, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'playlistId' }),
    __metadata("design:type", playlist_entity_1.Playlist)
], PlaylistItem.prototype, "playlist", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlaylistItem.prototype, "contentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => content_entity_1.Content, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'contentId' }),
    __metadata("design:type", content_entity_1.Content)
], PlaylistItem.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PlaylistItem.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PlaylistItem.prototype, "durationSeconds", void 0);
exports.PlaylistItem = PlaylistItem = __decorate([
    (0, typeorm_1.Entity)('playlist_items')
], PlaylistItem);
//# sourceMappingURL=playlist-item.entity.js.map