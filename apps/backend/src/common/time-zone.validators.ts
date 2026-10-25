import { ValidationOptions, registerDecorator } from 'class-validator';
import { isValidTimeZone } from './zoned-time.util';

/**
 * Accepts only a time zone the runtime knows. An organisation's zone feeds every
 * schedule and event-rule calculation, which would otherwise fail on first use.
 */
export function IsTimeZone(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name: 'isTimeZone',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isValidTimeZone(value),
        defaultMessage: () =>
          `${String(propertyName)} must be an IANA time zone such as Europe/Berlin`,
      },
    });
  };
}
