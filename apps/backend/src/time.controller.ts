import { Controller, Get } from '@nestjs/common';
import { Public } from './auth';

/**
 * Lightweight server-clock endpoint. Players poll this repeatedly to estimate
 * their offset to the server clock (NTP-lite), so that all screens in a group
 * can compute the same deterministic playlist position from a shared epoch.
 * No auth, no DB — must stay cheap and fast for accurate round-trip timing.
 */
@Controller('time')
export class TimeController {
  @Public()
  @Get()
  now(): { now: number } {
    return { now: Date.now() };
  }
}
