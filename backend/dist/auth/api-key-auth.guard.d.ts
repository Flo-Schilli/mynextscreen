import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { Screen } from '../screen/screen.entity';
export interface ScreenAuthenticatedRequest extends Request {
    screenId: string;
    organisationId: string;
}
export declare class ApiKeyAuthGuard implements CanActivate {
    private readonly reflector;
    private readonly screenRepository;
    constructor(reflector: Reflector, screenRepository: Repository<Screen>);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractToken;
    private findScreenByApiKey;
}
