import {
  emptyEventScheduleForm,
  eventScheduleFormFrom,
  previewTargetName,
  targetNames,
  targetOptions,
  toEventScheduleRequest,
  validateEventScheduleForm,
  windowCrossesMidnight,
} from './event-schedule-state';
import { EventScheduleRule } from './event-schedule.model';

const RULE: EventScheduleRule = {
  id: 'r1',
  organisationId: 'org1',
  sourceId: 's1',
  name: 'Hirsch-Abend',
  venues: ['Hirsch'],
  playlistId: 'p1',
  windowStart: '18:00',
  windowEnd: '01:00',
  excludeCancelled: false,
  colour: '#f59e0b',
  enabled: true,
  screenIds: ['sc1'],
  groupIds: ['g1'],
  lastReconciledAt: null,
  lastReconcileSummary: null,
  createdAt: '',
  updatedAt: '',
};

const SCREENS = [{ id: 'sc1', name: 'Foyer' }];
const GROUPS = [{ id: 'g1', name: 'Wall' }];

describe('event schedule state', () => {
  it('round-trips a rule through the form into a request', () => {
    const request = toEventScheduleRequest(eventScheduleFormFrom(RULE));

    expect(request).toEqual({
      name: 'Hirsch-Abend',
      venues: ['Hirsch'],
      playlistId: 'p1',
      windowStart: '18:00',
      windowEnd: '01:00',
      screenIds: ['sc1'],
      groupIds: ['g1'],
      excludeCancelled: false,
      colour: '#f59e0b',
      enabled: true,
    });
  });

  it('trims the name of a request', () => {
    const form = { ...eventScheduleFormFrom(RULE), name: '  Abend  ' };

    expect(toEventScheduleRequest(form).name).toBe('Abend');
  });

  it('flags every missing field of an empty form', () => {
    const form = { ...emptyEventScheduleForm(), windowEnd: '' };

    expect(validateEventScheduleForm(form)).toEqual([
      'name',
      'venues',
      'playlist',
      'window',
      'targets',
    ]);
  });

  it('accepts a complete form', () => {
    expect(validateEventScheduleForm(eventScheduleFormFrom(RULE))).toEqual([]);
  });

  it('offers screens and marked groups as targets', () => {
    expect(targetOptions(SCREENS, GROUPS, (name) => `Group · ${name}`)).toEqual([
      { value: 'screen:sc1', label: 'Foyer' },
      { value: 'group:g1', label: 'Group · Wall' },
    ]);
  });

  it('names the targets of a rule and skips deleted ones', () => {
    expect(targetNames({ screenIds: ['sc1', 'gone'], groupIds: ['g1'] }, SCREENS, GROUPS)).toEqual([
      'Foyer',
      'Wall',
    ]);
  });

  it('names a preview target', () => {
    expect(previewTargetName({ screenId: 'sc1', groupId: null }, SCREENS, GROUPS)).toBe('Foyer');
    expect(previewTargetName({ screenId: null, groupId: 'g1' }, SCREENS, GROUPS)).toBe('Wall');
    expect(previewTargetName({ screenId: null, groupId: 'x' }, SCREENS, GROUPS)).toBe('?');
  });

  it('knows when a window runs past midnight', () => {
    expect(windowCrossesMidnight('18:00', '01:00')).toBe(true);
    expect(windowCrossesMidnight('18:00', '18:00')).toBe(true);
    expect(windowCrossesMidnight('18:00', '23:30')).toBe(false);
  });
});
