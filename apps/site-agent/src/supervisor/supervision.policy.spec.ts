import {
  BACKOFF_CAP_MS,
  LAUNCH_COOLDOWN_MS,
  WAKE_COOLDOWN_MS,
  backoffFor,
  decideAction,
  isDevmodeExtensionDue,
  isWakeBeforeScheduleDue,
} from './supervision.policy';
import { newRuntime } from './screen-runtime';
import type { AgentScreenConfigMessage } from '../protocol/server-protocol';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-01T12:00:00.000Z');

function screen(overrides: Partial<AgentScreenConfigMessage> = {}): AgentScreenConfigMessage {
  return {
    screenId: 's1',
    name: 'Foyer left',
    localIp: '192.168.1.50',
    macAddress: null,
    ssapPort: 3001,
    devmodePassphrase: 'AEBC72',
    autoLaunchEnabled: true,
    extendDevmodeEnabled: true,
    devmodeExtendIntervalDays: 7,
    lastDevmodeExtendAt: new Date(NOW - DAY_MS).toISOString(),
    wakeBeforeScheduleEnabled: false,
    wakeLeadTimeMinutes: 10,
    wakeOnUnreachableEnabled: false,
    playerHeartbeatStale: false,
    nextScheduleStartAt: null,
    sshHostKeyFingerprint: null,
    keyStatus: 'ok',
    sshStatus: 'ok',
    ssapStatus: 'ok',
    onboardingStep: 8,
    ...overrides,
  };
}

describe('isDevmodeExtensionDue', () => {
  it('is due when it has never been extended', () => {
    expect(isDevmodeExtensionDue(screen({ lastDevmodeExtendAt: null }), NOW, 0)).toBe(true);
  });

  it('is not due inside the interval', () => {
    expect(isDevmodeExtensionDue(screen(), NOW, 0)).toBe(false);
  });

  it('is due once the interval has passed', () => {
    const last = new Date(NOW - 8 * DAY_MS).toISOString();

    expect(isDevmodeExtensionDue(screen({ lastDevmodeExtendAt: last }), NOW, 0)).toBe(true);
  });

  it('respects the per-screen jitter so twenty sets do not all get SSH at once', () => {
    const last = new Date(NOW - 7 * DAY_MS - 60_000).toISOString();

    expect(isDevmodeExtensionDue(screen({ lastDevmodeExtendAt: last }), NOW, 10 * 60_000)).toBe(
      false,
    );
  });

  // Once it is half an interval overdue, the session is close enough to expiry
  // that spreading load stops being worth it — an expired session means the TV
  // has already deleted the app.
  it('ignores the jitter once it is badly overdue', () => {
    const last = new Date(NOW - 11 * DAY_MS).toISOString();

    expect(isDevmodeExtensionDue(screen({ lastDevmodeExtendAt: last }), NOW, 30 * 60_000)).toBe(
      true,
    );
  });

  it('is never due when the feature is switched off', () => {
    const off = screen({ extendDevmodeEnabled: false, lastDevmodeExtendAt: null });

    expect(isDevmodeExtensionDue(off, NOW, 0)).toBe(false);
  });

  it('honours a one-day interval', () => {
    const config = screen({
      devmodeExtendIntervalDays: 1,
      lastDevmodeExtendAt: new Date(NOW - 2 * DAY_MS).toISOString(),
    });

    expect(isDevmodeExtensionDue(config, NOW, 0)).toBe(true);
  });
});

describe('isWakeBeforeScheduleDue', () => {
  const withSchedule = (minutesAway: number, overrides = {}) =>
    screen({
      macAddress: 'AA:BB:CC:DD:EE:FF',
      wakeBeforeScheduleEnabled: true,
      nextScheduleStartAt: new Date(NOW + minutesAway * 60_000).toISOString(),
      ...overrides,
    });

  it('is due inside the lead time', () => {
    expect(isWakeBeforeScheduleDue(withSchedule(8), NOW)).toBe(true);
  });

  it('is not due before the lead time', () => {
    expect(isWakeBeforeScheduleDue(withSchedule(45), NOW)).toBe(false);
  });

  // The schedule has already begun; waking now is late and the set that is
  // meant to be showing it is either on or a different problem.
  it('is not due once the schedule has started', () => {
    expect(isWakeBeforeScheduleDue(withSchedule(-5), NOW)).toBe(false);
  });

  it('is never due without a MAC address', () => {
    expect(isWakeBeforeScheduleDue(withSchedule(5, { macAddress: null }), NOW)).toBe(false);
  });

  it('is never due when the toggle is off', () => {
    expect(
      isWakeBeforeScheduleDue(withSchedule(5, { wakeBeforeScheduleEnabled: false }), NOW),
    ).toBe(false);
  });

  it('is not due when nothing is scheduled', () => {
    const config = screen({
      macAddress: 'AA:BB:CC:DD:EE:FF',
      wakeBeforeScheduleEnabled: true,
      nextScheduleStartAt: null,
    });

    expect(isWakeBeforeScheduleDue(config, NOW)).toBe(false);
  });
});

describe('decideAction', () => {
  const runtime = () => newRuntime(0);

  describe('when the TV does not answer', () => {
    it('wakes it before a schedule', () => {
      const config = screen({
        macAddress: 'AA:BB:CC:DD:EE:FF',
        wakeBeforeScheduleEnabled: true,
        nextScheduleStartAt: new Date(NOW + 5 * 60_000).toISOString(),
      });

      expect(decideAction(config, false, runtime(), NOW)).toEqual({
        kind: 'wake',
        reason: 'schedule',
      });
    });

    // "The TV is off at 03:00" is not a fault to react to, which is why this
    // one is opt-in.
    it('does nothing by default', () => {
      expect(decideAction(screen(), false, runtime(), NOW)).toEqual({ kind: 'none' });
    });

    it('wakes it anyway when the operator asked for that', () => {
      const config = screen({
        macAddress: 'AA:BB:CC:DD:EE:FF',
        wakeOnUnreachableEnabled: true,
      });

      expect(decideAction(config, false, runtime(), NOW)).toEqual({
        kind: 'wake',
        reason: 'unreachable',
      });
    });

    it('holds off while the wake cooldown is running', () => {
      const config = screen({ macAddress: 'AA:BB:CC:DD:EE:FF', wakeOnUnreachableEnabled: true });
      const state = { ...runtime(), lastWakeAt: NOW - WAKE_COOLDOWN_MS + 1_000 };

      expect(decideAction(config, false, state, NOW)).toEqual({ kind: 'none' });
    });
  });

  describe('when the TV answers', () => {
    // Load-bearing order: an expired Developer Mode session means the set has
    // already deleted the app, so launching it first would fail for a reason
    // nobody could see.
    it('extends Developer Mode before launching the app', () => {
      const config = screen({ lastDevmodeExtendAt: null, playerHeartbeatStale: true });

      expect(decideAction(config, true, runtime(), NOW)).toEqual({ kind: 'extend-devmode' });
    });

    it('launches the app when the player is not reporting', () => {
      const config = screen({ playerHeartbeatStale: true });

      expect(decideAction(config, true, runtime(), NOW)).toEqual({ kind: 'launch' });
    });

    it('does nothing while the player is reporting', () => {
      expect(decideAction(screen(), true, runtime(), NOW)).toEqual({ kind: 'none' });
    });

    it('respects the launch cooldown', () => {
      const config = screen({ playerHeartbeatStale: true });
      const state = { ...runtime(), lastLaunchAt: NOW - LAUNCH_COOLDOWN_MS + 1_000 };

      expect(decideAction(config, true, state, NOW)).toEqual({ kind: 'none' });
    });

    it('leaves the app alone when auto-launch is off', () => {
      const config = screen({ playerHeartbeatStale: true, autoLaunchEnabled: false });

      expect(decideAction(config, true, runtime(), NOW)).toEqual({ kind: 'none' });
    });
  });
});

describe('backoffFor', () => {
  it('doubles with each consecutive failure', () => {
    expect(backoffFor(1, 60_000)).toBe(60_000);
    expect(backoffFor(2, 60_000)).toBe(120_000);
    expect(backoffFor(3, 60_000)).toBe(240_000);
  });

  // Without a cap, a set that is permanently dead would eventually be checked
  // once a century.
  it('caps so a dead screen is still revisited', () => {
    expect(backoffFor(99, 60_000)).toBe(BACKOFF_CAP_MS);
  });

  it('is never negative for a zero failure count', () => {
    expect(backoffFor(0, 60_000)).toBe(60_000);
  });
});
