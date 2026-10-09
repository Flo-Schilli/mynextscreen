import { describe, expect, it } from 'vitest';
import { pendingAppLaunchAt } from './site-agent.model';

const NOW = Date.parse('2026-10-09T14:30:00.000Z');
const IN_THREE_MINUTES = '2026-10-09T14:33:00.000Z';

describe('pendingAppLaunchAt', () => {
  const remote = (overrides = {}) => ({
    reachability: 'reachable' as const,
    appLaunchPlannedAt: IN_THREE_MINUTES,
    ...overrides,
  });

  it('returns the announced launch for a set that answers but is not playing', () => {
    expect(pendingAppLaunchAt(remote(), false, NOW)).toEqual(new Date(IN_THREE_MINUTES));
  });

  it('returns null once the player reports', () => {
    expect(pendingAppLaunchAt(remote(), true, NOW)).toBeNull();
  });

  it('returns null for a set that does not answer', () => {
    expect(pendingAppLaunchAt(remote({ reachability: 'unreachable' }), false, NOW)).toBeNull();
  });

  it('returns null when nothing is announced', () => {
    expect(pendingAppLaunchAt(remote({ appLaunchPlannedAt: null }), false, NOW)).toBeNull();
  });

  // The agent clears it with its next probe; until then a time in the past
  // would only confuse.
  it('returns null once the announced time has passed', () => {
    expect(pendingAppLaunchAt(remote(), false, Date.parse(IN_THREE_MINUTES) + 1)).toBeNull();
  });
});
