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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const screen_auth_decorator_1 = require("./screen-auth.decorator");
const screen_entity_1 = require("../screen/screen.entity");
const api_key_util_1 = require("../screen/api-key.util");
let ApiKeyAuthGuard = class ApiKeyAuthGuard {
    reflector;
    screenRepository;
    constructor(reflector, screenRepository) {
        this.reflector = reflector;
        this.screenRepository = screenRepository;
    }
    async canActivate(context) {
        const isScreenAuth = this.reflector.getAllAndOverride(screen_auth_decorator_1.IS_SCREEN_AUTH_KEY, [context.getHandler(), context.getClass()]);
        if (!isScreenAuth) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);
        if (!token) {
            throw new common_1.UnauthorizedException('Missing API key');
        }
        const screen = await this.findScreenByApiKey(token);
        if (!screen) {
            throw new common_1.UnauthorizedException('Invalid API key');
        }
        request.screenId = screen.id;
        request.organisationId = screen.organisationId;
        return true;
    }
    extractToken(request) {
        const authorization = request.headers['authorization'];
        if (!authorization) {
            return null;
        }
        const [scheme, token] = authorization.split(' ');
        if (scheme !== 'Bearer' || !token) {
            return null;
        }
        return token;
    }
    async findScreenByApiKey(apiKey) {
        const screens = await this.screenRepository.find({
            select: ['id', 'organisationId', 'apiKeyHash'],
        });
        for (const screen of screens) {
            const match = await (0, api_key_util_1.verifyApiKey)(apiKey, screen.apiKeyHash);
            if (match) {
                return screen;
            }
        }
        return null;
    }
};
exports.ApiKeyAuthGuard = ApiKeyAuthGuard;
exports.ApiKeyAuthGuard = ApiKeyAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(screen_entity_1.Screen)),
    __metadata("design:paramtypes", [core_1.Reflector,
        typeorm_2.Repository])
], ApiKeyAuthGuard);
//# sourceMappingURL=api-key-auth.guard.js.map