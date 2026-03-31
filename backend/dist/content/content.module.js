"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const content_entity_1 = require("./content.entity");
const organisation_entity_1 = require("../organisation/organisation.entity");
const content_service_1 = require("./content.service");
const content_controller_1 = require("./content.controller");
const transcoding_processor_1 = require("./transcoding.processor");
const organisation_module_1 = require("../organisation/organisation.module");
let ContentModule = class ContentModule {
};
exports.ContentModule = ContentModule;
exports.ContentModule = ContentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([content_entity_1.Content, organisation_entity_1.Organisation]),
            bullmq_1.BullModule.registerQueue({
                name: 'transcoding',
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                },
            }),
            organisation_module_1.OrganisationModule,
        ],
        controllers: [content_controller_1.ContentController],
        providers: [content_service_1.ContentService, transcoding_processor_1.TranscodingProcessor],
        exports: [typeorm_1.TypeOrmModule, content_service_1.ContentService],
    })
], ContentModule);
//# sourceMappingURL=content.module.js.map