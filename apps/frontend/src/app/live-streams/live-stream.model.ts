export type LiveStreamStatus = 'idle' | 'active' | 'error';
export type LiveStreamProtocol = 'rtmp' | 'rtp';
export type LiveStreamSourceType = 'pull' | 'ndi';
export type QualityPreset = 'preview' | '720p30' | '1080p30';
export type EncoderPref = 'auto' | 'software' | 'hardware';
export type NdiStreamState = 'connecting' | 'streaming' | 'error';
export type TranscodingPreset =
  'low_480p' | 'medium_720p' | 'high_1080p' | 'full_hd_plus_1440p' | 'passthrough';

export interface LiveStream {
  id: string;
  organisationId: string;
  name: string;
  sourceType: LiveStreamSourceType;
  /** Pull streams only. */
  sourceUrl?: string;
  /** Pull streams only. */
  protocol?: LiveStreamProtocol;
  agentId: string | null;
  cameraHost: string | null;
  ndiSourceName: string | null;
  qualityPreset: QualityPreset | null;
  encoderPref: EncoderPref | null;
  status: LiveStreamStatus;
  transcodingPreset: TranscodingPreset;
  audioEnabled: boolean;
  ndiStatus?: NdiStatus;
  health?: StreamHealthState;
  createdAt: string;
  updatedAt: string;
}

export interface NdiStatus {
  state: NdiStreamState;
  sourceName: string | null;
  encoder: string | null;
  fps: number | null;
  framesDropped: number;
  uploadLagMs: number | null;
  error: string | null;
}

export interface StreamHealthState {
  streamId: string;
  status: LiveStreamStatus;
  health: string;
  checkedAt: string;
}

export interface CreateLiveStreamRequest {
  name: string;
  sourceType?: LiveStreamSourceType;
  sourceUrl?: string;
  protocol?: LiveStreamProtocol;
  agentId?: string;
  cameraHost?: string;
  ndiSourceName?: string;
  qualityPreset?: QualityPreset;
  encoderPref?: EncoderPref;
  transcodingPreset?: TranscodingPreset;
  audioEnabled?: boolean;
}

export interface UpdateLiveStreamRequest {
  name?: string;
  sourceUrl?: string;
  protocol?: LiveStreamProtocol;
  agentId?: string;
  cameraHost?: string;
  ndiSourceName?: string | null;
  qualityPreset?: QualityPreset;
  encoderPref?: EncoderPref;
  transcodingPreset?: TranscodingPreset;
  audioEnabled?: boolean;
}

export interface ActivateLiveStreamRequest {
  targetScreenIds?: string[];
  targetGroupId?: string;
}

export interface ActivateStreamResponse {
  stream: LiveStream;
  warnings: string[];
}

export const TRANSCODING_PRESETS: TranscodingPreset[] = [
  'low_480p',
  'medium_720p',
  'high_1080p',
  'full_hd_plus_1440p',
  'passthrough',
];

export const QUALITY_PRESETS: QualityPreset[] = ['preview', '720p30', '1080p30'];
export const ENCODER_PREFS: EncoderPref[] = ['auto', 'software', 'hardware'];

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_GROUP = /^[0-9a-fA-F]{1,4}$/;
const IPV6_MAX_GROUPS = 8;

function isValidIpv6(value: string): boolean {
  if (!value.includes(':') || value.split('::').length > 2) return false;
  const [head, tail] = value.split('::');
  const groups = (part: string | undefined): string[] => (part ? part.split(':') : []);
  const all = [...groups(head), ...groups(tail)];
  if (!all.every((g) => IPV6_GROUP.test(g))) return false;
  return value.includes('::') ? all.length < IPV6_MAX_GROUPS : all.length === IPV6_MAX_GROUPS;
}

/** True for a plain IPv4 or IPv6 address (no hostnames, ports or zone ids). */
export function isValidIpAddress(value: string): boolean {
  return IPV4_PATTERN.test(value) || isValidIpv6(value);
}
