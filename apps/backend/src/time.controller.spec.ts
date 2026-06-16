import { TimeController } from './time.controller';

describe('TimeController', () => {
  it('returns the current server time in epoch milliseconds', () => {
    const controller = new TimeController();
    const before = Date.now();
    const { now } = controller.now();
    const after = Date.now();

    expect(typeof now).toBe('number');
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});
