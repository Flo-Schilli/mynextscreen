import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { isInternalIpAddress } from '../common/outbound-url.util';

/**
 * Rate limiting keyed on the real client, not on the proxy.
 *
 * In production the backend never sees the client socket: Caddy sits in front,
 * and on the admin path the frontend nginx proxies `/api/` on top of that. With
 * the default tracker every request therefore shares one bucket, which turns the
 * 5/min login limit into a platform-wide limit — five requests from anyone lock
 * out every user of every organisation.
 *
 * Caddy sets `X-Real-IP` on both paths (nginx forwards it unchanged), so that
 * header is the client. It is only honoured when the request actually arrived
 * from an internal hop: if the container port is reachable directly, a forged
 * header from the outside would otherwise let an attacker pick their own bucket
 * and bypass the limit entirely.
 */
@Injectable()
export class ProxyAwareThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Request): Promise<string> {
    const socketAddress = req.socket?.remoteAddress ?? '';
    const forwarded = req.headers['x-real-ip'];
    const claimedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;

    if (claimedIp && socketAddress && isInternalIpAddress(socketAddress)) {
      return claimedIp;
    }
    return req.ip ?? socketAddress;
  }
}
