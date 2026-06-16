import { Controller, Get, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth';
import {
  ScreenPairingService,
  type PairingStatusResult,
  type StartedPairing,
} from './screen-pairing.service';

/**
 * Public pairing routes (device-flow). No `@Roles`/`@ScreenAuth`: the start
 * endpoint is throttled and the status endpoint is secured by a 256-bit secret.
 */
@Controller('screens/pairing')
export class ScreenPairingController {
  constructor(private readonly pairingService: ScreenPairingService) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  start(): Promise<StartedPairing> {
    return this.pairingService.startPairing();
  }

  @Get(':pairingId/status')
  @Public()
  // NAT rationale: a venue runs several screens behind one public IP, each
  // polling this endpoint (~every 3s ≈ 20 req/min). The default per-IP tracker
  // would aggregate all of them and trip a 60/min limit. 300/60s comfortably
  // covers ~15 screens behind one IP while still bounding abuse; the endpoint
  // is additionally guarded by the 256-bit per-pairing secret.
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  status(
    @Param('pairingId', ParseUUIDPipe) pairingId: string,
    @Headers('x-pairing-secret') pairingSecret: string | undefined,
  ): Promise<PairingStatusResult> {
    return this.pairingService.getStatus(pairingId, pairingSecret);
  }
}
