export type LiveStreamStatus = 'idle' | 'active' | 'error';
export type LiveStreamProtocol = 'rtmp' | 'rtp';
export type TranscodingPreset =
  'low_480p' | 'medium_720p' | 'high_1080p' | 'full_hd_plus_1440p' | 'passthrough';

export interface LiveStream {
  id: string;
  organisationId: string;
  name: string;
  sourceUrl: string;
  protocol: LiveStreamProtocol;
  status: LiveStreamStatus;
  transcodingPreset: TranscodingPreset;
  audioEnabled: boolean;
  health?: StreamHealthState;
  createdAt: string;
  updatedAt: string;
}

export interface StreamHealthState {
  streamId: string;
  status: LiveStreamStatus;
  health: string;
  checkedAt: string;
}

export interface CreateLiveStreamRequest {
  name: string;
  sourceUrl: string;
  protocol: LiveStreamProtocol;
  transcodingPreset?: TranscodingPreset;
  audioEnabled?: boolean;
}

export interface UpdateLiveStreamRequest {
  name?: string;
  sourceUrl?: string;
  protocol?: LiveStreamProtocol;
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

export const TRANSCODING_PRESET_LABELS: Record<TranscodingPreset, string> = {
  low_480p: 'Low (480p)',
  medium_720p: 'Medium (720p)',
  high_1080p: 'High (1080p)',
  full_hd_plus_1440p: 'Full HD+ (1440p)',
  passthrough: 'Passthrough (no re-encode)',
};

export const TRANSCODING_PRESETS: TranscodingPreset[] = [
  'low_480p',
  'medium_720p',
  'high_1080p',
  'full_hd_plus_1440p',
  'passthrough',
];
