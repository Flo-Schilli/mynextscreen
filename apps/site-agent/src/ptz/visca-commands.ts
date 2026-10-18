import type { PtzCommandMessage, PtzDirectionValue } from '../protocol/server-protocol';

/** Camera address 1, the only one on a point-to-point link. */
const ADDRESS = 0x81;
const TERMINATOR = 0xff;

const PAN_MAX = 0x18;
const TILT_MAX = 0x14;
const DASHBOARD_SPEED_MAX = 10;
const ZOOM_SPEED_MAX = 7;
const PRESET_MAX = 15;

const PAN_LEFT = 0x01;
const PAN_RIGHT = 0x02;
const PAN_STOP = 0x03;
const TILT_UP = 0x01;
const TILT_DOWN = 0x02;
const TILT_STOP = 0x03;

/** Pan and tilt direction bytes (`PP`, `TT`) per dashboard direction. */
const DIRECTIONS: Readonly<Record<PtzDirectionValue, readonly [number, number]>> = {
  up: [PAN_STOP, TILT_UP],
  down: [PAN_STOP, TILT_DOWN],
  left: [PAN_LEFT, TILT_STOP],
  right: [PAN_RIGHT, TILT_STOP],
  up_left: [PAN_LEFT, TILT_UP],
  up_right: [PAN_RIGHT, TILT_UP],
  down_left: [PAN_LEFT, TILT_DOWN],
  down_right: [PAN_RIGHT, TILT_DOWN],
};

const frame = (...bytes: number[]): Buffer => Buffer.from([ADDRESS, ...bytes, TERMINATOR]);

function toInteger(value: unknown, min: number, max: number, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid ${what}`);
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Scales the dashboard's 1..10 onto the camera's range, never below 1. */
function scaleSpeed(speed: unknown, cameraMax: number): number {
  const level = toInteger(speed, 1, DASHBOARD_SPEED_MAX, 'speed');
  return Math.max(1, Math.round((level * cameraMax) / DASHBOARD_SPEED_MAX));
}

function presetNumber(preset: unknown): number {
  if (
    typeof preset !== 'number' ||
    !Number.isInteger(preset) ||
    preset < 0 ||
    preset > PRESET_MAX
  ) {
    throw new Error('Invalid preset');
  }
  return preset;
}

/** `81 01 06 01 VV WW PP TT FF`. */
export function panTilt(direction: PtzDirectionValue, speed: number): Buffer {
  const bytes = DIRECTIONS[direction];
  if (!bytes) {
    throw new Error('Invalid direction');
  }
  return frame(0x01, 0x06, 0x01, scaleSpeed(speed, PAN_MAX), scaleSpeed(speed, TILT_MAX), ...bytes);
}

/** Pan/tilt stop at the slowest speed, `81 01 06 01 01 01 03 03 FF`. */
export function panTiltStop(): Buffer {
  return frame(0x01, 0x06, 0x01, 0x01, 0x01, PAN_STOP, TILT_STOP);
}

/** `81 01 04 07 00 FF`. */
export function zoomStop(): Buffer {
  return frame(0x01, 0x04, 0x07, 0x00);
}

/** Tele (`2p`) for in, wide (`3p`) for out; speed 0..7. */
export function zoom(direction: 'in' | 'out', speed: number): Buffer {
  if (direction !== 'in' && direction !== 'out') {
    throw new Error('Invalid direction');
  }
  const p = toInteger(speed, 0, ZOOM_SPEED_MAX, 'speed');
  return frame(0x01, 0x04, 0x07, (direction === 'in' ? 0x20 : 0x30) | p);
}

/** `81 01 06 04 FF`. */
export function home(): Buffer {
  return frame(0x01, 0x06, 0x04);
}

/** `81 01 04 3F 02 pp FF`. */
export function presetRecall(preset: number): Buffer {
  return frame(0x01, 0x04, 0x3f, 0x02, presetNumber(preset));
}

/** `81 01 04 3F 01 pp FF`. */
export function presetStore(preset: number): Buffer {
  return frame(0x01, 0x04, 0x3f, 0x01, presetNumber(preset));
}

/**
 * The messages for one command, in send order. Throws on a value outside the
 * contract: the command comes off the network, so it is not trusted.
 */
export function buildCommand(command: PtzCommandMessage): Buffer[] {
  switch (command.action) {
    case 'move':
      return [panTilt(command.direction, command.speed)];
    case 'stop':
      return [panTiltStop(), zoomStop()];
    case 'zoom':
      return [zoom(command.direction, command.speed)];
    case 'home':
      return [home()];
    case 'preset_recall':
      return [presetRecall(command.preset)];
    case 'preset_store':
      return [presetStore(command.preset)];
    default:
      throw new Error('Unknown PTZ action');
  }
}
