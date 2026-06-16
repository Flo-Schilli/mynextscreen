import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth';

/** Shown in the admin "Add a screen" modal when PLAYER_BASE_URL is unset. */
const DEFAULT_PLAYER_URL = 'screen.mynextscreen.app';

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
    const playerUrl = this.config.get<string>('PLAYER_BASE_URL');
    return { playerUrl: playerUrl?.trim() ? playerUrl : DEFAULT_PLAYER_URL };
  }
}
