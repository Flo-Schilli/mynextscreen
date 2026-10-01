import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Body, Controller, Get, Header, Post, UseGuards } from '@nestjs/common';
import { SetupService, type SetupStatus } from './setup.service';
import { SetupAuthGuard } from './setup-auth.guard';
import { SetupPublic } from './setup-public.decorator';
import { SetupEnrolDto } from './dto/enrol-request.dto';

/**
 * The agent's own web interface, on the venue LAN.
 *
 * It exists so the agent can be started without knowing yet where it belongs:
 * `podman run` with no variables, then point a browser at it. Everything that
 * changes the agent's identity needs the PIN from the container log; the status
 * view does not, and therefore returns nothing secret — no token, no
 * passphrase, not even the TVs' addresses.
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

  @Post('api/enrol')
  enrol(@Body() dto: SetupEnrolDto): Promise<SetupStatus> {
    return this.setup.enrol(dto.serverUrl, dto.enrolmentToken);
  }

  @Post('api/reset')
  reset(): Promise<SetupStatus> {
    return this.setup.reset();
  }
}
