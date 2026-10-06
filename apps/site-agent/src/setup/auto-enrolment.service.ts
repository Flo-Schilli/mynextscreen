import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConnectionStore } from '../connection/connection.store';
import { SetupService } from './setup.service';

/**
 * Enrols at boot from `MNS_ENROLMENT_TOKEN`, so a venue can be brought up by a
 * deployment alone — no browser, no setup page, `MNS_SETUP_PORT=0`.
 *
 * Only when nothing is stored yet. A setup code is single-use, so a container
 * that restarts with the same variable still set would otherwise spend its
 * boot trying to redeem a code the server marked consumed on first start, and
 * report that as a failure every time. The stored session is the record of
 * having enrolled; the variable is only the way in.
 *
 * Failure is logged, never fatal. An expired or already-redeemed code must not
 * stop an agent that is otherwise configured correctly: with the setup page
 * enabled an operator can still paste a fresh code, and with it disabled the
 * log says what to change in the deployment.
 */
@Injectable()
export class AutoEnrolmentService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AutoEnrolmentService.name);

  constructor(
    private readonly connections: ConnectionStore,
    private readonly setup: SetupService,
    /** From `MNS_ENROLMENT_TOKEN`. Null means this path is not in use. */
    private readonly enrolmentToken: string | null,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enrolmentToken) {
      return;
    }

    if (await this.connections.load()) {
      this.logger.log(
        'Already enrolled; MNS_ENROLMENT_TOKEN ignored. Remove it from the deployment — a setup code is spent once it has been redeemed.',
      );
      return;
    }

    try {
      const status = await this.setup.enrol(undefined, this.enrolmentToken);
      this.logger.log(
        `Enrolled from MNS_ENROLMENT_TOKEN as agent ${status.agentId} of organisation ${status.organisationId}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Enrolment from MNS_ENROLMENT_TOKEN failed: ${reason}. Issue a new setup code in the dashboard; the agent keeps running without a session until then.`,
      );
    }
  }
}
