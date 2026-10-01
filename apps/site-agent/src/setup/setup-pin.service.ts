import { randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';

/** Two groups of four digits: short enough to retype, long enough to not guess. */
const PIN_GROUPS = 2;
const DIGITS_PER_GROUP = 4;

/**
 * Guards the setup UI.
 *
 * Before enrolment there is no secret on the agent to protect. What needs
 * protecting is the *target*: without a hurdle, anyone on the venue LAN could
 * point the agent at their own server and would then hold SSH reach to every TV
 * in the building.
 *
 * The PIN is generated at boot and written to the container log, so whoever
 * deployed the agent can read it and a guest on the same network cannot. It is
 * never persisted and never returned by the status endpoint, and it changes on
 * every restart — which is also the recovery path when someone loses it.
 */
@Injectable()
export class SetupPinService {
  private readonly logger = new Logger(SetupPinService.name);
  private readonly pin: string;
  private readonly isFixed: boolean;

  constructor(configuredPin: string | null) {
    this.isFixed = configuredPin !== null && configuredPin !== '';
    this.pin = this.isFixed ? (configuredPin as string) : SetupPinService.generate();
  }

  private static generate(): string {
    return Array.from({ length: PIN_GROUPS }, () =>
      String(randomInt(0, 10 ** DIGITS_PER_GROUP)).padStart(DIGITS_PER_GROUP, '0'),
    ).join('-');
  }

  /** Announces the PIN once at boot. Never logged again. */
  announce(setupUrl: string): void {
    this.logger.log(`Setup interface: ${setupUrl}`);
    if (this.isFixed) {
      this.logger.log('Setup PIN: taken from MNS_SETUP_PIN');
    } else {
      this.logger.log(`Setup PIN: ${this.pin}`);
    }
  }

  /**
   * Constant-time comparison. A length-leaking `===` would be a small thing on
   * an eight-digit PIN, but there is no reason to leak it.
   */
  matches(candidate: string | undefined): boolean {
    if (!candidate) {
      return false;
    }
    const expected = Buffer.from(this.pin, 'utf8');
    const actual = Buffer.from(candidate, 'utf8');
    if (expected.length !== actual.length) {
      return false;
    }
    return timingSafeEqual(expected, actual);
  }
}
