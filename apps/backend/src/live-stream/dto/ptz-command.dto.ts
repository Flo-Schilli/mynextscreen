import {
  IsIn,
  IsInt,
  Max,
  Min,
  ValidateBy,
  ValidateIf,
  type ValidationOptions,
} from 'class-validator';
import {
  PTZ_ACTIONS,
  PTZ_MOVE_DIRECTIONS,
  PTZ_MOVE_SPEED_MAX,
  PTZ_MOVE_SPEED_MIN,
  PTZ_PRESET_MAX,
  PTZ_PRESET_MIN,
  PTZ_ZOOM_DIRECTIONS,
  PTZ_ZOOM_SPEED_MAX,
  PTZ_ZOOM_SPEED_MIN,
  type PtzAction,
  type PtzCommand,
} from '../ptz-command';

const isAction =
  (...actions: PtzAction[]) =>
  (dto: PtzCommandDto): boolean =>
    actions.includes(dto.action);

/** Passes when `value` is valid for the action the DTO carries. */
function ForAction(
  name: string,
  check: (value: unknown, action: PtzAction) => boolean,
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name,
      validator: {
        validate: (value: unknown, args): boolean =>
          check(value, (args?.object as PtzCommandDto).action),
        defaultMessage: (args): string => `${args?.property ?? 'value'} is invalid for the action`,
      },
    },
    options,
  );
}

const isIntInRange = (value: unknown, min: number, max: number): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/**
 * One flat DTO for every PTZ command. Which fields apply depends on `action`;
 * the rest are ignored and dropped by {@link toPtzCommand}.
 */
export class PtzCommandDto {
  @IsIn(PTZ_ACTIONS)
  action!: PtzAction;

  /** `move`: one of eight directions; `zoom`: `in` or `out`. */
  @ValidateIf(isAction('move', 'zoom'))
  @ForAction('ptzDirection', (value, action) =>
    action === 'move'
      ? (PTZ_MOVE_DIRECTIONS as readonly unknown[]).includes(value)
      : (PTZ_ZOOM_DIRECTIONS as readonly unknown[]).includes(value),
  )
  direction?: string;

  /** `move`: 1..10; `zoom`: 1..7. */
  @ValidateIf(isAction('move', 'zoom'))
  @ForAction('ptzSpeed', (value, action) =>
    action === 'move'
      ? isIntInRange(value, PTZ_MOVE_SPEED_MIN, PTZ_MOVE_SPEED_MAX)
      : isIntInRange(value, PTZ_ZOOM_SPEED_MIN, PTZ_ZOOM_SPEED_MAX),
  )
  speed?: number;

  /** `preset_recall` / `preset_store`: 0..15. */
  @ValidateIf(isAction('preset_recall', 'preset_store'))
  @IsInt()
  @Min(PTZ_PRESET_MIN)
  @Max(PTZ_PRESET_MAX)
  preset?: number;
}

/** Narrows a validated DTO to the exact wire command, dropping stray fields. */
export function toPtzCommand(dto: PtzCommandDto): PtzCommand {
  switch (dto.action) {
    case 'move':
      return {
        action: 'move',
        direction: dto.direction as Extract<PtzCommand, { action: 'move' }>['direction'],
        speed: dto.speed as number,
      };
    case 'zoom':
      return {
        action: 'zoom',
        direction: dto.direction as Extract<PtzCommand, { action: 'zoom' }>['direction'],
        speed: dto.speed as number,
      };
    case 'preset_recall':
    case 'preset_store':
      return { action: dto.action, preset: dto.preset as number };
    default:
      return { action: dto.action };
  }
}
