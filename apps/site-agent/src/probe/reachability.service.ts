import { Socket } from 'node:net';
import { Injectable } from '@nestjs/common';
import type { ScreenReachabilityValue } from '../protocol/server-protocol';

const PROBE_TIMEOUT_MS = 3_000;

export interface ProbeResult {
  reachability: ScreenReachabilityValue;
  detail?: string;
}

/**
 * Checks whether a TV answers on the network.
 *
 * A TCP connect rather than ICMP: a ping would need `CAP_NET_RAW`, and the
 * container drops every capability. Probing the SSAP port also answers the
 * question that actually matters — not "does something reply at this address"
 * but "is this set ready to be told to do something".
 */
@Injectable()
export class ReachabilityService {
  async probe(host: string | null, port: number): Promise<ProbeResult> {
    if (!host) {
      return { reachability: 'unknown', detail: 'No address configured for this screen' };
    }

    return new Promise((resolve) => {
      const socket = new Socket();
      let settled = false;

      const settle = (result: ProbeResult): void => {
        if (settled) {
          return;
        }
        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(PROBE_TIMEOUT_MS);
      socket.once('connect', () => settle({ reachability: 'reachable' }));
      socket.once('timeout', () =>
        settle({ reachability: 'unreachable', detail: `No answer from ${host}:${port}` }),
      );
      socket.once('error', (error) =>
        settle({ reachability: 'unreachable', detail: `${error.message} (${host}:${port})` }),
      );
      socket.connect(port, host);
    });
  }
}
