"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const screen_entity_1 = require("./screen.entity");
const screen_service_1 = require("./screen.service");
const screen_state_service_1 = require("./screen-state.service");
const screen_controller_1 = require("./screen.controller");
const screen_scheduler_1 = require("./screen.scheduler");
const screen_protocol_1 = require("../screen-protocol");
const screen_protocol_service_1 = require("../screen-protocol/screen-protocol.service");
const schedule_1 = require("../schedule");
const screen_group_entity_1 = require("../screen-group/screen-group.entity");
const sliced_rendition_entity_1 = require("../slice-content/sliced-rendition.entity");
let ScreenModule = class ScreenModule {
};
exports.ScreenModule = ScreenModule;
exports.ScreenModule = ScreenModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([screen_entity_1.Screen, screen_group_entity_1.ScreenGroup, sliced_rendition_entity_1.SlicedRendition]),
            screen_protocol_1.ScreenProtocolModule,
            schedule_1.ScheduleEntryModule,
        ],
        controllers: [screen_controller_1.ScreenController],
        providers: [screen_service_1.ScreenService, screen_state_service_1.ScreenStateService, screen_scheduler_1.ScreenScheduler, screen_protocol_service_1.ScreenProtocolService],
        exports: [screen_service_1.ScreenService, screen_state_service_1.ScreenStateService, screen_protocol_service_1.ScreenProtocolService, typeorm_1.TypeOrmModule],
    })
], ScreenModule);
//# sourceMappingURL=screen.module.js.map