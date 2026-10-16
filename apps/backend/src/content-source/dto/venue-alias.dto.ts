import { Transform } from 'class-transformer';
import {
  IsString,
  MaxLength,
  MinLength,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { MAX_VENUE_NAME_LENGTH, type VenueAlias } from '../content-source.types';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** One raw venue name and the canonical name it is shown and filtered by. */
export class VenueAliasDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_VENUE_NAME_LENGTH)
  raw!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_VENUE_NAME_LENGTH)
  canonical!: string;
}

/**
 * Problems of an alias list as a whole, or null. Each raw name appears once,
 * never maps onto itself, and no canonical name is itself aliased: one level,
 * so neither chains nor cycles exist.
 */
export function venueAliasListProblem(aliases: readonly VenueAlias[]): string | null {
  const raws = new Set<string>();
  for (const { raw, canonical } of aliases) {
    if (raw === canonical) return `venue alias "${raw}" maps onto itself`;
    if (raws.has(raw)) return `venue "${raw}" has more than one alias`;
    raws.add(raw);
  }
  const chained = aliases.find(({ canonical }) => raws.has(canonical));
  return chained
    ? `canonical venue "${chained.canonical}" is itself an alias; aliases have one level`
    : null;
}

const isAliasLike = (value: unknown): value is VenueAlias =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as VenueAlias).raw === 'string' &&
  typeof (value as VenueAlias).canonical === 'string';

@ValidatorConstraint({ name: 'venueAliasList', async: false })
export class VenueAliasListConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    // Element shape is checked by the nested DTO; only judge well-formed lists here.
    if (!Array.isArray(value) || !value.every(isAliasLike)) return true;
    return venueAliasListProblem(value) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    const value = args.value as VenueAlias[];
    return venueAliasListProblem(value) ?? 'venueAliases is invalid';
  }
}

/** Plain copy for storage: no class instances. */
export function toVenueAliases(dtos: readonly VenueAliasDto[]): VenueAlias[] {
  return dtos.map(({ raw, canonical }) => ({ raw, canonical }));
}
