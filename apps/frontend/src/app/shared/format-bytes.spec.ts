import { formatBytes } from './format-bytes';

describe('formatBytes', () => {
  it('renders zero and negative values as "0 B"', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-100)).toBe('0 B');
  });

  it('renders whole bytes without decimals', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('renders larger units with one decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024 * 5)).toBe('5.0 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe('2.0 GB');
  });
});
