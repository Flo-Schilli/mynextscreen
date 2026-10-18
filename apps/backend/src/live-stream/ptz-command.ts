export const PTZ_MOVE_DIRECTIONS = [
  'up',
  'down',
  'left',
  'right',
  'up_left',
  'up_right',
  'down_left',
  'down_right',
] as const;
export type PtzMoveDirection = (typeof PTZ_MOVE_DIRECTIONS)[number];

export const PTZ_ZOOM_DIRECTIONS = ['in', 'out'] as const;
export type PtzZoomDirection = (typeof PTZ_ZOOM_DIRECTIONS)[number];

export const PTZ_ACTIONS = [
  'move',
  'stop',
  'zoom',
  'home',
  'preset_recall',
  'preset_store',
] as const;
export type PtzAction = (typeof PTZ_ACTIONS)[number];

export const PTZ_MOVE_SPEED_MIN = 1;
export const PTZ_MOVE_SPEED_MAX = 10;
export const PTZ_ZOOM_SPEED_MIN = 1;
export const PTZ_ZOOM_SPEED_MAX = 7;
export const PTZ_PRESET_MIN = 0;
export const PTZ_PRESET_MAX = 15;

/** Wire format shared with the site agent; never carries an address. */
export type PtzCommand =
  | { action: 'move'; direction: PtzMoveDirection; speed: number }
  | { action: 'stop' }
  | { action: 'zoom'; direction: PtzZoomDirection; speed: number }
  | { action: 'home' }
  | { action: 'preset_recall'; preset: number }
  | { action: 'preset_store'; preset: number };

/** Actions worth an audit entry: continuous move/stop/zoom ticks are not. */
const AUDITED_PTZ_ACTIONS: ReadonlySet<PtzAction> = new Set<PtzAction>([
  'home',
  'preset_recall',
  'preset_store',
]);

export const isAuditedPtzAction = (action: PtzAction): boolean => AUDITED_PTZ_ACTIONS.has(action);
