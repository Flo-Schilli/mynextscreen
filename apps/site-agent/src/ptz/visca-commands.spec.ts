import type { PtzDirectionValue } from '../protocol/server-protocol';
import {
  buildCommand,
  home,
  panTilt,
  panTiltStop,
  presetRecall,
  presetStore,
  zoom,
  zoomStop,
} from './visca-commands';

const hex = (buffer: Buffer): string => buffer.toString('hex');

describe('visca-commands', () => {
  describe('panTilt', () => {
    it.each<[PtzDirectionValue, string]>([
      ['up', '0301'],
      ['down', '0302'],
      ['left', '0103'],
      ['right', '0203'],
      ['up_left', '0101'],
      ['up_right', '0201'],
      ['down_left', '0102'],
      ['down_right', '0202'],
    ])('encodes %s as PP/TT %s', (direction, pptt) => {
      expect(hex(panTilt(direction, 10))).toBe(`810106011814${pptt}ff`);
    });

    it.each([
      [1, '0202'],
      [5, '0c0a'],
      [8, '1310'],
      [10, '1814'],
    ])('scales speed %i to pan/tilt %s', (speed, vvww) => {
      expect(hex(panTilt('left', speed))).toBe(`81010601${vvww}0103ff`);
    });

    it('clamps speeds outside 1..10', () => {
      expect(hex(panTilt('left', 0))).toBe(hex(panTilt('left', 1)));
      expect(hex(panTilt('left', 99))).toBe(hex(panTilt('left', 10)));
    });

    it('rejects a non-numeric speed and an unknown direction', () => {
      expect(() => panTilt('left', Number.NaN)).toThrow('Invalid speed');
      expect(() => panTilt('sideways' as PtzDirectionValue, 5)).toThrow('Invalid direction');
    });
  });

  it('encodes pan/tilt stop', () => {
    expect(hex(panTiltStop())).toBe('8101060101010303ff');
  });

  it('encodes zoom stop', () => {
    expect(hex(zoomStop())).toBe('8101040700ff');
  });

  describe('zoom', () => {
    it.each([
      ['in', 0, '2'],
      ['in', 3, '23'],
      ['in', 7, '27'],
      ['out', 0, '30'],
      ['out', 7, '37'],
    ] as const)('encodes %s at speed %i', (direction, speed, byte) => {
      const expected = byte.length === 1 ? `${byte}${speed}` : byte;
      expect(hex(zoom(direction, speed))).toBe(`81010407${expected}ff`);
    });

    it('clamps speed above 7 and rejects a bad direction', () => {
      expect(hex(zoom('in', 12))).toBe('8101040727ff');
      expect(() => zoom('sideways' as 'in', 3)).toThrow('Invalid direction');
    });
  });

  it('encodes home', () => {
    expect(hex(home())).toBe('81010604ff');
  });

  describe('presets', () => {
    it.each([0, 2, 15])('encodes recall %i', (preset) => {
      expect(hex(presetRecall(preset))).toBe(`8101043f02${preset.toString(16).padStart(2, '0')}ff`);
    });

    it.each([0, 5, 15])('encodes store %i', (preset) => {
      expect(hex(presetStore(preset))).toBe(`8101043f01${preset.toString(16).padStart(2, '0')}ff`);
    });

    it.each([-1, 16, 1.5, Number.NaN])('rejects preset %p', (preset) => {
      expect(() => presetRecall(preset)).toThrow('Invalid preset');
      expect(() => presetStore(preset)).toThrow('Invalid preset');
    });
  });

  describe('buildCommand', () => {
    it('maps every action', () => {
      expect(buildCommand({ action: 'move', direction: 'left', speed: 10 }).map(hex)).toEqual([
        '8101060118140103ff',
      ]);
      expect(buildCommand({ action: 'stop' }).map(hex)).toEqual([
        '8101060101010303ff',
        '8101040700ff',
      ]);
      expect(buildCommand({ action: 'zoom', direction: 'out', speed: 1 }).map(hex)).toEqual([
        '8101040731ff',
      ]);
      expect(buildCommand({ action: 'home' }).map(hex)).toEqual(['81010604ff']);
      expect(buildCommand({ action: 'preset_recall', preset: 3 }).map(hex)).toEqual([
        '8101043f0203ff',
      ]);
      expect(buildCommand({ action: 'preset_store', preset: 3 }).map(hex)).toEqual([
        '8101043f0103ff',
      ]);
    });

    it('throws on an unknown action', () => {
      expect(() => buildCommand({ action: 'dance' } as never)).toThrow('Unknown PTZ action');
    });
  });
});
