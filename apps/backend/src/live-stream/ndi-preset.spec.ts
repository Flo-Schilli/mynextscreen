import { NdiQualityPreset } from './ndi-quality-preset.enum';
import { resolveNdiPreset } from './ndi-preset';

describe('resolveNdiPreset', () => {
  it.each([
    [NdiQualityPreset.Preview, 'lowest', 640, 360, 30, 800],
    [NdiQualityPreset.P720, 'highest', 1280, 720, 30, 3000],
    [NdiQualityPreset.P1080, 'highest', 1920, 1080, 30, 6000],
  ])('resolves %s', (preset, bandwidth, width, height, fps, bitrateKbps) => {
    expect(resolveNdiPreset(preset)).toEqual({ bandwidth, width, height, fps, bitrateKbps });
  });

  it('returns a copy so callers cannot alter the table', () => {
    const first = resolveNdiPreset(NdiQualityPreset.P720);
    first.width = 1;

    expect(resolveNdiPreset(NdiQualityPreset.P720).width).toBe(1280);
  });
});
