"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SliceContentModule = exports.SLICE_CONTENT_QUEUE = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const sliced_rendition_entity_1 = require("./sliced-rendition.entity");
const slice_content_processor_1 = require("./slice-content.processor");
const screen_group_entity_1 = require("../screen-group/screen-group.entity");
const screen_entity_1 = require("../screen/screen.entity");
const playlist_entity_1 = require("../playlist/playlist.entity");
const content_entity_1 = require("../content/content.entity");
exports.SLICE_CONTENT_QUEUE = 'slice-content';
let SliceContentModule = class SliceContentModule {
};
exports.SliceContentModule = SliceContentModule;
exports.SliceContentModule = SliceContentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                sliced_rendition_entity_1.SlicedRendition,
                screen_group_entity_1.ScreenGroup,
                screen_entity_1.Screen,
                playlist_entity_1.Playlist,
                content_entity_1.Content,
            ]),
            bullmq_1.BullModule.registerQueue({
                name: exports.SLICE_CONTENT_QUEUE,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                },
            }),
        ],
        providers: [slice_content_processor_1.SliceContentProcessor],
        exports: [typeorm_1.TypeOrmModule, bullmq_1.BullModule],
    })
], SliceContentModule);
//# sourceMappingURL=slice-content.module.js.map