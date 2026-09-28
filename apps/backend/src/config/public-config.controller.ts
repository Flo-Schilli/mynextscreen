import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth';

export interface PublicConfig {
  /** Human-facing URL where displays open the player to pair (env PLAYER_BASE_URL). */
  playerUrl: string;
}

/**
 * Public, env-driven instance config consumed by the admin SPA. Carries only
 * non-secret presentational values (e.g. the player URL shown in the add-screen
 * pairing hint), so it stays `@Public()` — the SPA reads it before/without auth.
 */
@Controller('config')
export class PublicConfigController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get()
  getConfig(): PublicConfig {
    // Empty when unset, never a host this instance does not own: the admin
    // hint tells operators which URL to open on the display, and naming
    // someone else's deployment there would send screens to a stranger.
    const playerUrl = this.config.get<string>('PLAYER_BASE_URL')?.trim();
    return { playerUrl: playerUrl ?? '' };
  }
}
