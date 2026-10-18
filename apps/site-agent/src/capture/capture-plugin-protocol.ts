/**
 * Control API of the capture plugin, as the agent uses it.
 *
 * HAND-SYNCED with `openapi.json` of the plugin repository
 * (https://github.com/Flo-Schilli/mynextscreen-capture-plugin), contract
 * version 1.0.0, commit cb7839f. A vendored copy of that file sits next to this
 * one (`openapi.json`), and `capture-plugin-contract.spec.ts` validates the
 * requests the client sends and the fixtures of its specs against it. To
 * update: copy the plugin's `openapi.json` over the vendored one, adjust this
 * file, and bump the version and commit named above.
 *
 * The plugin never imports code from this repository and vice versa: the two
 * only exchange this JSON.
 */

/** Major version of the contract this client speaks. An unknown major is `incompatible`. */
export const CAPTURE_API_MAJOR = '1';

export type PluginState = 'license_required' | 'ready' | 'error' | 'incompatible';

export type PluginErrorCode =
  'unsupported_platform' | 'runtime_missing' | 'runtime_mismatch' | 'ndi_load_failed';

export interface PluginLicenseInfo {
  sdkVersion: string;
  licenseSha256: string;
  ndiLicenseSha256: string;
  termsSha256: string;
}

export interface PluginLicenseAcceptance {
  sdkVersion: string;
  licenseSha256: string;
  via: 'api' | 'env';
  acceptedAt: string;
}

/** `GET /v1/status`. */
export interface PluginStatus {
  apiVersion: string;
  pluginVersion: string;
  state: PluginState;
  errorCode: PluginErrorCode | null;
  sdkVersion: string | null;
  license: PluginLicenseInfo | null;
  acceptance: PluginLicenseAcceptance | null;
  arch: string;
  encoders: string[];
}

export type PluginBandwidth = 'lowest' | 'highest';
export type PluginEncoderPreference = 'auto' | 'software' | 'hardware';

/** Body of `PUT /v1/streams/:streamId`. */
export interface PluginStreamConfig {
  cameraHost: string;
  ndiSourceName: string | null;
  bandwidth: PluginBandwidth;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  encoderPref: PluginEncoderPreference;
}

export type PluginStreamState = 'connecting' | 'streaming' | 'error';

export type PluginStreamErrorCode =
  'source_not_found' | 'ffmpeg_exited' | 'no_frames' | 'resolution_changed' | 'internal_error';

/** One entry of `GET /v1/streams` and the answer to `PUT /v1/streams/:streamId`. */
export interface PluginStreamStatus {
  streamId: string;
  state: PluginStreamState;
  sourceName: string | null;
  encoder: string | null;
  fps: number | null;
  framesDropped: number;
  error: PluginStreamErrorCode | null;
}

/** `GET /v1/streams`. */
export interface PluginStreamList {
  streams: PluginStreamStatus[];
}

/** Error body of every non-2xx answer. */
export interface PluginErrorResponse {
  error: { code: string; message: string };
}

export const PLUGIN_STATES: readonly PluginState[] = [
  'license_required',
  'ready',
  'error',
  'incompatible',
];
