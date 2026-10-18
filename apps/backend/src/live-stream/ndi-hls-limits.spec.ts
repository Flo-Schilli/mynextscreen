import { DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES, resolveNdiHlsMaxUploadBytes } from './ndi-hls-limits';

describe('resolveNdiHlsMaxUploadBytes', () => {
  const configOf = (value: unknown) => ({
    get: (_key: string, fallback: unknown) => value ?? fallback,
  });

  it('defaults to 8 MiB', () => {
    expect(resolveNdiHlsMaxUploadBytes(configOf(undefined) as never)).toBe(
      DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES,
    );
  });

  it('accepts numbers and numeric strings, floored', () => {
    expect(resolveNdiHlsMaxUploadBytes(configOf('1024') as never)).toBe(1024);
    expect(resolveNdiHlsMaxUploadBytes(configOf(10.9) as never)).toBe(10);
  });

  it.each(['abc', '0', '-5', Infinity])('falls back to the default for %s', (value) => {
    expect(resolveNdiHlsMaxUploadBytes(configOf(value) as never)).toBe(
      DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES,
    );
  });
});
