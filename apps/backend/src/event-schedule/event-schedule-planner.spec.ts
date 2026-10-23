import {
  EVENT_SCHEDULE_HORIZON_DAYS,
  planEventSlots,
  windowOf,
  type PlannerEvent,
  type PlannerRule,
} from './event-schedule-planner';

const TZ = 'Europe/Berlin';

function rule(overrides: Partial<PlannerRule> = {}): PlannerRule {
  return {
    venues: ['Hirsch'],
    windowStart: '18:00',
    windowEnd: '23:30',
    excludeCancelled: true,
    enabled: true,
    ...overrides,
  };
}

function event(overrides: Partial<PlannerEvent> = {}): PlannerEvent {
  return {
    id: 'e1',
    eventDate: '2026-11-05',
    venue: 'Hirsch',
    cancelled: false,
    goneAt: null,
    ...overrides,
  };
}

const NOW = new Date('2026-11-01T12:00:00Z');
const NO_ALIASES = new Map<string, string>();

describe('windowOf', () => {
  it('places the window on the event day in the organisation time zone', () => {
    const { startTime, endTime } = windowOf('2026-11-05', '18:00', '23:30', TZ);

    expect(startTime.toISOString()).toBe('2026-11-05T17:00:00.000Z');
    expect(endTime.toISOString()).toBe('2026-11-05T22:30:00.000Z');
  });

  it('puts an end at or before the start on the next day', () => {
    const { startTime, endTime } = windowOf('2026-11-05', '18:00', '01:00', TZ);

    expect(startTime.toISOString()).toBe('2026-11-05T17:00:00.000Z');
    expect(endTime.toISOString()).toBe('2026-11-06T00:00:00.000Z');
  });

  it('ends in summer time when the window closes before the clocks go back', () => {
    // 01:00 on 25 October 2026 is still CEST; the switch is at 03:00.
    const { endTime } = windowOf('2026-10-24', '18:00', '01:00', TZ);

    expect(endTime.toISOString()).toBe('2026-10-24T23:00:00.000Z');
  });

  it('keeps the wall-clock window across a DST switch', () => {
    // Summer time ends in the night to 25 October 2026.
    const { startTime, endTime } = windowOf('2026-10-24', '20:00', '04:00', TZ);

    expect(startTime.toISOString()).toBe('2026-10-24T18:00:00.000Z');
    expect(endTime.toISOString()).toBe('2026-10-25T03:00:00.000Z');
  });
});

describe('planEventSlots', () => {
  it('plans a slot for an event at a rule venue', () => {
    const slots = planEventSlots(rule(), [event()], NO_ALIASES, new Set(), NOW, TZ);

    expect(slots).toHaveLength(1);
    expect(slots[0].event.id).toBe('e1');
    expect(slots[0].startTime.toISOString()).toBe('2026-11-05T17:00:00.000Z');
  });

  it('skips events at other venues', () => {
    const slots = planEventSlots(
      rule(),
      [event({ venue: 'Löwensaal' })],
      NO_ALIASES,
      new Set(),
      NOW,
      TZ,
    );

    expect(slots).toEqual([]);
  });

  it('matches a venue by its canonical name', () => {
    const aliases = new Map([['Der Hirsch', 'Hirsch']]);

    const slots = planEventSlots(
      rule(),
      [event({ venue: 'Der Hirsch' })],
      aliases,
      new Set(),
      NOW,
      TZ,
    );

    expect(slots).toHaveLength(1);
  });

  it('reads a rule venue that got aliased later as its canonical name', () => {
    const aliases = new Map([['Der Hirsch', 'Hirsch']]);

    const slots = planEventSlots(
      rule({ venues: ['Der Hirsch'] }),
      [event({ venue: 'Hirsch' })],
      aliases,
      new Set(),
      NOW,
      TZ,
    );

    expect(slots).toHaveLength(1);
  });

  it('skips cancelled events unless the rule keeps them', () => {
    const cancelled = event({ cancelled: true });

    expect(planEventSlots(rule(), [cancelled], NO_ALIASES, new Set(), NOW, TZ)).toEqual([]);
    expect(
      planEventSlots(
        rule({ excludeCancelled: false }),
        [cancelled],
        NO_ALIASES,
        new Set(),
        NOW,
        TZ,
      ),
    ).toHaveLength(1);
  });

  it('skips events the source no longer lists', () => {
    const gone = event({ goneAt: new Date('2026-10-30T00:00:00Z') });

    expect(planEventSlots(rule(), [gone], NO_ALIASES, new Set(), NOW, TZ)).toEqual([]);
  });

  it('skips excluded events', () => {
    expect(planEventSlots(rule(), [event()], NO_ALIASES, new Set(['e1']), NOW, TZ)).toEqual([]);
  });

  it('plans nothing for a disabled rule', () => {
    expect(
      planEventSlots(rule({ enabled: false }), [event()], NO_ALIASES, new Set(), NOW, TZ),
    ).toEqual([]);
  });

  it('keeps a slot that is running and drops one that has ended', () => {
    const running = new Date('2026-11-05T20:00:00Z');
    const ended = new Date('2026-11-05T23:00:00Z');

    expect(planEventSlots(rule(), [event()], NO_ALIASES, new Set(), running, TZ)).toHaveLength(1);
    expect(planEventSlots(rule(), [event()], NO_ALIASES, new Set(), ended, TZ)).toEqual([]);
  });

  it('keeps yesterday’s event while its window runs past midnight', () => {
    const afterMidnight = new Date('2026-11-05T23:30:00Z');

    const slots = planEventSlots(
      rule({ windowEnd: '02:00' }),
      [event()],
      NO_ALIASES,
      new Set(),
      afterMidnight,
      TZ,
    );

    expect(slots).toHaveLength(1);
  });

  it('plans no further ahead than the horizon', () => {
    const inside = event({ id: 'in', eventDate: '2026-12-30' });
    const outside = event({ id: 'out', eventDate: '2027-02-15' });

    const slots = planEventSlots(rule(), [inside, outside], NO_ALIASES, new Set(), NOW, TZ);

    expect(EVENT_SCHEDULE_HORIZON_DAYS).toBe(90);
    expect(slots.map((slot) => slot.event.id)).toEqual(['in']);
  });
});
