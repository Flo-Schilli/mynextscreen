import { isIP } from 'node:net';
import { registerDecorator, type ValidationOptions } from 'class-validator';

/** Returns the embedded IPv4 of an IPv4-mapped IPv6 address (`::ffff:a.b.c.d`), else null. */
function mappedIPv4(address: string): string | null {
  const match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  return match ? match[1] : null;
}

function isDisallowedIPv4(address: string): boolean {
  const [a, b] = address.split('.').map(Number);
  return (
    a === 0 || // unspecified / "this network"
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local
    a >= 224 // multicast and reserved
  );
}

function isDisallowedIPv6(address: string): boolean {
  const lower = address.toLowerCase();
  const mapped = mappedIPv4(lower);
  if (mapped) {
    return isDisallowedIPv4(mapped);
  }
  if (lower === '::' || lower === '::1') {
    return true;
  }
  const firstGroup = parseInt(lower.split(':')[0] || '0', 16);
  return (
    (firstGroup & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (firstGroup & 0xff00) === 0xff00 // ff00::/8 multicast
  );
}

/**
 * True for an address that can never be a camera on the venue network:
 * loopback, link-local, multicast and unspecified. Non-IP input is not judged
 * here, `@IsIP` reports that.
 */
export function isDisallowedCameraHost(value: string): boolean {
  const version = isIP(value);
  if (version === 4) {
    return isDisallowedIPv4(value);
  }
  return version === 6 ? isDisallowedIPv6(value) : false;
}

/** Rejects loopback, link-local, multicast and unspecified camera addresses. */
export function IsRoutableCameraHost(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'isRoutableCameraHost',
      target: target.constructor,
      propertyName: propertyName as string,
      options: {
        message:
          'cameraHost must be a camera address on the venue network, not a loopback, link-local, multicast or unspecified address',
        ...options,
      },
      validator: {
        validate: (value: unknown) => typeof value !== 'string' || !isDisallowedCameraHost(value),
      },
    });
}
