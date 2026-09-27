import { ValidationOptions, registerDecorator } from 'class-validator';
import {
  OutboundUrlOptions,
  isSafeOutboundHostSyntax,
  isSafeOutboundUrlSyntax,
} from './outbound-url.util';

/**
 * Rejects URLs pointing at the local machine or a private/reserved network at
 * save time, so an org admin cannot turn a webhook setting into an SSRF probe.
 * The resolved-address check runs again right before the request is sent.
 */
export function IsSafeOutboundUrl(
  outbound: OutboundUrlOptions = {},
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name: 'isSafeOutboundUrl',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isSafeOutboundUrlSyntax(value, outbound),
        defaultMessage: () =>
          `${String(propertyName)} must be an absolute URL that does not point at a private or local address`,
      },
    });
  };
}

/** {@link IsSafeOutboundUrl} for a bare host name, e.g. an SMTP server. */
export function IsSafeOutboundHost(
  outbound: OutboundUrlOptions = {},
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name: 'isSafeOutboundHost',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isSafeOutboundHostSyntax(value, outbound),
        defaultMessage: () =>
          `${String(propertyName)} must be a host that does not point at a private or local address`,
      },
    });
  };
}
