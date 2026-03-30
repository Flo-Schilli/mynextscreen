import { Controller, Get } from '@nestjs/common';
import { Public } from './auth';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
