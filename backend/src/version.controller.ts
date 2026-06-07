import { Controller, Get } from '@nestjs/common';
import { Public } from './auth';

export interface VersionInfo {
  version: string;
  commit: string;
  builtAt: string;
}

@Controller('version')
export class VersionController {
  @Public()
  @Get()
  version(): VersionInfo {
    return {
      version: process.env.APP_VERSION ?? '0.0.0-dev',
      commit: process.env.GIT_COMMIT ?? 'unknown',
      builtAt: process.env.BUILD_DATE ?? 'unknown',
    };
  }
}
