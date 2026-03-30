import {
  parseDuration,
  parseProgressTime,
  calculateProgress,
} from './ffmpeg-progress.util';

describe('ffmpeg-progress.util', () => {
  describe('parseDuration', () => {
    it('should parse a standard duration line', () => {
      const chunk =
        '  Duration: 00:05:30.50, start: 0.000000, bitrate: 1234 kb/s';
      expect(parseDuration(chunk)).toBe(330.5);
    });

    it('should parse duration with hours', () => {
      const chunk = '  Duration: 01:30:00.00, start: 0.000000';
      expect(parseDuration(chunk)).toBe(5400);
    });

    it('should return null when no duration is found', () => {
      expect(parseDuration('frame=  120 fps= 30')).toBeNull();
    });

    it('should parse zero duration', () => {
      const chunk = '  Duration: 00:00:00.00, start: 0.000000';
      expect(parseDuration(chunk)).toBe(0);
    });
  });

  describe('parseProgressTime', () => {
    it('should parse a standard progress line', () => {
      const chunk =
        'frame=  120 fps= 30 q=28.0 size=    256kB time=00:00:04.00 bitrate= 523.3kbits/s';
      expect(parseProgressTime(chunk)).toBe(4.0);
    });

    it('should parse progress with hours and minutes', () => {
      const chunk =
        'frame= 5400 fps= 30 q=28.0 size=   10240kB time=01:15:30.50 bitrate= 1234.5kbits/s';
      expect(parseProgressTime(chunk)).toBe(4530.5);
    });

    it('should return null when no time is found', () => {
      expect(parseProgressTime('some random output')).toBeNull();
    });
  });

  describe('calculateProgress', () => {
    it('should calculate correct percentage', () => {
      expect(calculateProgress(50, 100)).toBe(50);
    });

    it('should round to nearest integer', () => {
      expect(calculateProgress(33.33, 100)).toBe(33);
    });

    it('should cap at 100%', () => {
      expect(calculateProgress(110, 100)).toBe(100);
    });

    it('should return null when current time is null', () => {
      expect(calculateProgress(null, 100)).toBeNull();
    });

    it('should return null when duration is null', () => {
      expect(calculateProgress(50, null)).toBeNull();
    });

    it('should return null when duration is zero', () => {
      expect(calculateProgress(50, 0)).toBeNull();
    });

    it('should handle small values', () => {
      expect(calculateProgress(0.5, 10)).toBe(5);
    });
  });
});
