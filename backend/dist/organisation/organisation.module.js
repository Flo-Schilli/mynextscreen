"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganisationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const organisation_entity_1 = require("./organisation.entity");
const playlist_entity_1 = require("../playlist/playlist.entity");
const organisation_service_1 = require("./organisation.service");
const organisation_controller_1 = require("./organisation.controller");
const default_playlist_controller_1 = require("./default-playlist.controller");
const storage_service_1 = require("./storage.service");
const storage_controller_1 = require("./storage.controller");
let OrganisationModule = class OrganisationModule {
};
exports.OrganisationModule = OrganisationModule;
exports.OrganisationModule = OrganisationModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([organisation_entity_1.Organisation, playlist_entity_1.Playlist])],
        controllers: [
            organisation_controller_1.OrganisationController,
            default_playlist_controller_1.DefaultPlaylistController,
            storage_controller_1.StorageController,
        ],
        providers: [organisation_service_1.OrganisationService, storage_service_1.StorageService],
        exports: [organisation_service_1.OrganisationService, storage_service_1.StorageService, typeorm_1.TypeOrmModule],
    })
], OrganisationModule);
//# sourceMappingURL=organisation.module.js.map