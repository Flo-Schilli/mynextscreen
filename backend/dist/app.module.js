"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const schedule_1 = require("@nestjs/schedule");
const event_emitter_1 = require("@nestjs/event-emitter");
const auth_1 = require("./auth");
const organisation_1 = require("./organisation");
const user_1 = require("./user");
const screen_1 = require("./screen");
const content_1 = require("./content");
const media_1 = require("./media");
const dashboard_1 = require("./dashboard");
const playlist_1 = require("./playlist");
const schedule_2 = require("./schedule");
const audit_log_1 = require("./audit-log");
const screen_group_module_1 = require("./screen-group/screen-group.module");
const slice_content_1 = require("./slice-content");
const health_controller_1 = require("./health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'better-sqlite3',
                    database: config.get('DATABASE_PATH', './data/signage.db'),
                    autoLoadEntities: true,
                    synchronize: false,
                    migrations: [__dirname + '/migrations/*{.ts,.js}'],
                    migrationsRun: true,
                }),
            }),
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    connection: {
                        url: config.get('REDIS_URL', 'redis://localhost:6379'),
                    },
                }),
            }),
            schedule_1.ScheduleModule.forRoot(),
            event_emitter_1.EventEmitterModule.forRoot(),
            auth_1.AuthModule,
            organisation_1.OrganisationModule,
            user_1.UserModule,
            screen_1.ScreenModule,
            content_1.ContentModule,
            media_1.MediaModule,
            dashboard_1.DashboardModule,
            playlist_1.PlaylistModule,
            schedule_2.ScheduleEntryModule,
            audit_log_1.AuditLogModule,
            screen_group_module_1.ScreenGroupModule,
            slice_content_1.SliceContentModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map