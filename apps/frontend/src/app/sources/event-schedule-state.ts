import { SelectOption } from '../ui';
import { EventScheduleRule, EventScheduleRuleRequest } from './event-schedule.model';

/** Editable state of the rule modal; targets are `screen:<id>` / `group:<id>` keys. */
export interface EventScheduleFormValue {
  name: string;
  venues: string[];
  playlistId: string;
  windowStart: string;
  windowEnd: string;
  targets: string[];
  excludeCancelled: boolean;
  colour: string;
  enabled: boolean;
}

export type EventScheduleFormError = 'name' | 'venues' | 'playlist' | 'window' | 'targets';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const SCREEN_PREFIX = 'screen:';
const GROUP_PREFIX = 'group:';

export const DEFAULT_RULE_COLOUR = '#6d6cf6';

export function emptyEventScheduleForm(): EventScheduleFormValue {
  return {
    name: '',
    venues: [],
    playlistId: '',
    windowStart: '18:00',
    windowEnd: '23:30',
    targets: [],
    excludeCancelled: true,
    colour: DEFAULT_RULE_COLOUR,
    enabled: true,
  };
}

export function eventScheduleFormFrom(rule: EventScheduleRule): EventScheduleFormValue {
  return {
    name: rule.name,
    venues: [...rule.venues],
    playlistId: rule.playlistId,
    windowStart: rule.windowStart,
    windowEnd: rule.windowEnd,
    targets: [
      ...rule.screenIds.map((id) => SCREEN_PREFIX + id),
      ...rule.groupIds.map((id) => GROUP_PREFIX + id),
    ],
    excludeCancelled: rule.excludeCancelled,
    colour: rule.colour,
    enabled: rule.enabled,
  };
}

/** Problems that keep the form from being saved, in field order. */
export function validateEventScheduleForm(value: EventScheduleFormValue): EventScheduleFormError[] {
  const errors: EventScheduleFormError[] = [];
  if (value.name.trim() === '') errors.push('name');
  if (value.venues.length === 0) errors.push('venues');
  if (value.playlistId === '') errors.push('playlist');
  if (!HH_MM.test(value.windowStart) || !HH_MM.test(value.windowEnd)) errors.push('window');
  if (value.targets.length === 0) errors.push('targets');
  return errors;
}

export function toEventScheduleRequest(value: EventScheduleFormValue): EventScheduleRuleRequest {
  return {
    name: value.name.trim(),
    venues: value.venues,
    playlistId: value.playlistId,
    windowStart: value.windowStart,
    windowEnd: value.windowEnd,
    screenIds: value.targets.flatMap((t) =>
      t.startsWith(SCREEN_PREFIX) ? [t.slice(SCREEN_PREFIX.length)] : [],
    ),
    groupIds: value.targets.flatMap((t) =>
      t.startsWith(GROUP_PREFIX) ? [t.slice(GROUP_PREFIX.length)] : [],
    ),
    excludeCancelled: value.excludeCancelled,
    colour: value.colour,
    enabled: value.enabled,
  };
}

/** Screens and groups as one picker list; groups are marked so both kinds stay apart. */
export function targetOptions(
  screens: readonly { id: string; name: string }[],
  groups: readonly { id: string; name: string }[],
  groupLabel: (name: string) => string,
): SelectOption[] {
  return [
    ...screens.map((s) => ({ value: SCREEN_PREFIX + s.id, label: s.name })),
    ...groups.map((g) => ({ value: GROUP_PREFIX + g.id, label: groupLabel(g.name) })),
  ];
}

/** Names of a rule's targets, screens first; unknown ids (deleted meanwhile) are skipped. */
export function targetNames(
  rule: Pick<EventScheduleRule, 'screenIds' | 'groupIds'>,
  screens: readonly { id: string; name: string }[],
  groups: readonly { id: string; name: string }[],
): string[] {
  const screenName = new Map(screens.map((s) => [s.id, s.name]));
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  return [
    ...rule.screenIds.flatMap((id) => screenName.get(id) ?? []),
    ...rule.groupIds.flatMap((id) => groupName.get(id) ?? []),
  ];
}

/** True when the window ends on the day after it starts. */
export function windowCrossesMidnight(windowStart: string, windowEnd: string): boolean {
  return windowEnd <= windowStart;
}

/** Name of a preview target, for status chips. */
export function previewTargetName(
  target: { screenId: string | null; groupId: string | null },
  screens: readonly { id: string; name: string }[],
  groups: readonly { id: string; name: string }[],
): string {
  if (target.screenId) return screens.find((s) => s.id === target.screenId)?.name ?? '?';
  return groups.find((g) => g.id === target.groupId)?.name ?? '?';
}
