import { NdiQualityPreset } from './ndi-quality-preset.enum';

export type NdiBandwidth = 'lowest' | 'highest';

export interface ResolvedNdiPreset {
  bandwidth: NdiBandwidth;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
}

const NDI_PRESETS: Readonly<Record<NdiQualityPreset, ResolvedNdiPreset>> = {
  [NdiQualityPreset.Preview]: {
    bandwidth: 'lowest',
    width: 640,
    height: 360,
    fps: 30,
    bitrateKbps: 800,
  },
  [NdiQualityPreset.P720]: {
    bandwidth: 'highest',
    width: 1280,
    height: 720,
    fps: 30,
    bitrateKbps: 3000,
  },
  [NdiQualityPreset.P1080]: {
    bandwidth: 'highest',
    width: 1920,
    height: 1080,
    fps: 30,
    bitrateKbps: 6000,
  },
};

/**
 * Single source of truth for what a quality preset means. The agent receives
 * the resolved values and never interprets preset names itself.
 */
export function resolveNdiPreset(preset: NdiQualityPreset): ResolvedNdiPreset {
  return { ...NDI_PRESETS[preset] };
}
