import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Body, Controller, Get, Header, Headers, Post, UseGuards } from '@nestjs/common';
import { SetupService, type SetupStatus } from './setup.service';
import { SetupAuthGuard } from './setup-auth.guard';
import { SetupPublic } from './setup-public.decorator';
import { SetupEnrolDto } from './dto/enrol-request.dto';

/**
 * The agent's own web interface, on the venue LAN.
 *
 * It exists so the agent can be started once its server address is pinned, then
 * pointed at from a browser. The one sensitive action — resetting a connected
 * agent — needs a fresh setup code from the dashboard; the status view does not,
 * and therefore returns nothing secret: no token, no passphrase, not even the
 * TVs' addresses.
 */
@Controller()
@UseGuards(SetupAuthGuard)
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get()
  @SetupPublic()
  @Header('Content-Type', 'text/html; charset=utf-8')
  // The page is served rather than bundled so it can be read on disk in the
  // container when something is wrong with it.
  page(): Promise<string> {
    return readFile(join(__dirname, 'public', 'index.html'), 'utf8');
  }

  @Get('api/status')
  @SetupPublic()
  status(): Promise<SetupStatus> {
    return this.setup.status();
  }

  // Public because the enrolment token in the body is itself the credential —
  // it is the single-use setup code the server minted for this agent. There is
  // no second gate to add that the token does not already provide.
  @Post('api/enrol')
  @SetupPublic()
  enrol(@Body() dto: SetupEnrolDto): Promise<SetupStatus> {
    return this.setup.enrol(dto.serverUrl, dto.enrolmentToken);
  }

  // Guarded: the fresh setup code travels in the X-Setup-Code header, which the
  // guard requires before this runs and the server then verifies.
  @Post('api/reset')
  reset(@Headers('x-setup-code') setupCode: string): Promise<SetupStatus> {
    return this.setup.reset(setupCode);
  }
}
