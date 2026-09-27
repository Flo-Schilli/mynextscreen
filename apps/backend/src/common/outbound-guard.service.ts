import { Injectable } from '@nestjs/common';
import {
  OutboundUrlOptions,
  assertOutboundHostAllowed,
  assertOutboundUrlAllowed,
} from './outbound-url.util';

/**
 * Injectable wrapper around the outbound-URL checks so call sites can be unit
 * tested without touching DNS, matching the repo convention of keeping external
 * calls behind a mockable dependency.
 */
@Injectable()
export class OutboundGuard {
  /** Throws BlockedOutboundUrlError when the URL must not be dialled. */
  assertUrl(rawUrl: string, options: OutboundUrlOptions = {}): Promise<URL> {
    return assertOutboundUrlAllowed(rawUrl, options);
  }

  /** Throws BlockedOutboundUrlError when the host must not be dialled. */
  assertHost(host: string, options: OutboundUrlOptions = {}): Promise<void> {
    return assertOutboundHostAllowed(host, options);
  }
}
