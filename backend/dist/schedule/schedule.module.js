"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleEntryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_entry_entity_1 = require("./schedule-entry.entity");
const organisation_entity_1 = require("../organisation/organisation.entity");
const screen_entity_1 = require("../screen/screen.entity");
const playlist_entity_1 = require("../playlist/playlist.entity");
const screen_group_entity_1 = require("../screen-group/screen-group.entity");
const schedule_service_1 = require("./schedule.service");
const schedule_controller_1 = require("./schedule.controller");
const slice_content_1 = require("../slice-content");
let ScheduleEntryModule = class ScheduleEntryModule {
};
exports.ScheduleEntryModule = ScheduleEntryModule;
exports.ScheduleEntryModule = ScheduleEntryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                schedule_entry_entity_1.ScheduleEntry,
                organisation_entity_1.Organisation,
                screen_entity_1.Screen,
                playlist_entity_1.Playlist,
                screen_group_entity_1.ScreenGroup,
            ]),
            slice_content_1.SliceContentModule,
        ],
        controllers: [schedule_controller_1.ScheduleController],
        providers: [schedule_service_1.ScheduleService],
        exports: [typeorm_1.TypeOrmModule, schedule_service_1.ScheduleService],
    })
], ScheduleEntryModule);
//# sourceMappingURL=schedule.module.js.map