import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
export interface AuthenticatedUser {
    userId: string;
    email: string;
}
export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}
export declare class JwtAuthGuard implements CanActivate {
    private readonly reflector;
    private readonly configService;
    private jwks;
    private hankoApiUrl;
    constructor(reflector: Reflector, configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractToken;
    private getJwks;
    private extractUser;
}
