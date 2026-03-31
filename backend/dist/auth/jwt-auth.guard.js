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
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const jose_1 = require("jose");
const public_decorator_1 = require("./public.decorator");
const screen_auth_decorator_1 = require("./screen-auth.decorator");
let JwtAuthGuard = class JwtAuthGuard {
    reflector;
    configService;
    jwks = null;
    hankoApiUrl;
    constructor(reflector, configService) {
        this.reflector = reflector;
        this.configService = configService;
        this.hankoApiUrl = this.configService.get('HANKO_API_URL', '');
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const isScreenAuth = this.reflector.getAllAndOverride(screen_auth_decorator_1.IS_SCREEN_AUTH_KEY, [context.getHandler(), context.getClass()]);
        if (isScreenAuth) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);
        if (!token) {
            throw new common_1.UnauthorizedException('Missing authentication token');
        }
        try {
            const jwks = this.getJwks();
            const { payload } = await (0, jose_1.jwtVerify)(token, jwks, {
                issuer: this.hankoApiUrl,
            });
            request.user = this.extractUser(payload);
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid authentication token');
        }
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
    getJwks() {
        if (!this.jwks) {
            if (!this.hankoApiUrl) {
                throw new Error('HANKO_API_URL is not configured');
            }
            const jwksUrl = new URL('/.well-known/jwks.json', this.hankoApiUrl);
            this.jwks = (0, jose_1.createRemoteJWKSet)(jwksUrl);
        }
        return this.jwks;
    }
    extractUser(payload) {
        return {
            userId: payload.sub ?? '',
            email: payload.email ?? '',
        };
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        config_1.ConfigService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map