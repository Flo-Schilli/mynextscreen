import {
  PLUGIN_STATES,
  type PluginLicenseAcceptance,
  type PluginLicenseInfo,
  type PluginLicenseText,
  type PluginState,
  type PluginStatus,
  type PluginStreamErrorCode,
  type PluginStreamState,
  type PluginStreamStatus,
} from './capture-plugin-protocol';

/**
 * The plugin's answers are untrusted input: the plugin is a separate program
 * and its files and socket sit on a volume another container can write to.
 * Everything that ends up in a report is validated and clamped here, to the
 * limits of the backend's DTOs, so plugin data can never make the backend
 * reject a report (and with it the screen observations in the same request).
 */

/** Mirror the backend's `agent-report.dto.ts` limits. */
export const MAX_PLUGIN_VERSION = 64;
export const MAX_API_VERSION = 16;
export const MAX_SOURCE_NAME = 200;
export const MAX_ENCODER = 100;
export const MAX_STREAMS = 50;
const MAX_FPS = 1000;

const SHA256_HEX = /^[0-9a-f]{64}$/;
const SDK_VERSION = /^\d+(\.\d+){1,3}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STREAM_STATES: readonly PluginStreamState[] = ['connecting', 'streaming', 'error'];
const STREAM_ERRORS: readonly string[] = [
  'source_not_found',
  'ffmpeg_exited',
  'no_frames',
  'resolution_changed',
  'internal_error',
];
const PLUGIN_ERRORS: readonly string[] = [
  'unsupported_platform',
  'runtime_missing',
  'runtime_mismatch',
  'ndi_load_failed',
];

type Dict = Record<string, unknown>;

export const isRecord = (value: unknown): value is Dict =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A string clamped to `max`, or null for anything else. */
function text(value: unknown, max: number): string | null {
  return typeof value === 'string' ? value.slice(0, max) : null;
}

function license(value: unknown): PluginLicenseInfo | null {
  if (!isRecord(value)) {
    return null;
  }
  const { sdkVersion, licenseSha256, ndiLicenseSha256, termsSha256 } = value;
  if (
    typeof sdkVersion !== 'string' ||
    !SDK_VERSION.test(sdkVersion) ||
    ![licenseSha256, ndiLicenseSha256, termsSha256].every(
      (hash) => typeof hash === 'string' && SHA256_HEX.test(hash),
    )
  ) {
    return null;
  }
  return {
    sdkVersion,
    licenseSha256: licenseSha256 as string,
    ndiLicenseSha256: ndiLicenseSha256 as string,
    termsSha256: termsSha256 as string,
  };
}

function acceptance(value: unknown): PluginLicenseAcceptance | null {
  if (!isRecord(value)) {
    return null;
  }
  const { sdkVersion, licenseSha256, via, acceptedAt } = value;
  if (
    typeof sdkVersion !== 'string' ||
    !SDK_VERSION.test(sdkVersion) ||
    typeof licenseSha256 !== 'string' ||
    !SHA256_HEX.test(licenseSha256) ||
    (via !== 'api' && via !== 'env')
  ) {
    return null;
  }
  return { sdkVersion, licenseSha256, via, acceptedAt: text(acceptedAt, 40) ?? '' };
}

/** Longest license text taken from the plugin, in bytes; the backend caps uploads at the same size. */
export const MAX_LICENSE_TEXT_BYTES = 256 * 1024;

/**
 * The answer of `GET /v1/license/text`, or null unless it is an object with
 * valid hashes and two non-empty strings within {@link MAX_LICENSE_TEXT_BYTES}.
 */
export function sanitizeLicenseText(body: unknown): PluginLicenseText | null {
  if (!isRecord(body)) {
    return null;
  }
  const info = license(body);
  const { licenseText, pluginTerms } = body;
  if (
    !info ||
    typeof licenseText !== 'string' ||
    typeof pluginTerms !== 'string' ||
    licenseText.length === 0 ||
    pluginTerms.length === 0 ||
    Buffer.byteLength(licenseText, 'utf8') > MAX_LICENSE_TEXT_BYTES ||
    Buffer.byteLength(pluginTerms, 'utf8') > MAX_LICENSE_TEXT_BYTES
  ) {
    return null;
  }
  return {
    sdkVersion: info.sdkVersion,
    licenseSha256: info.licenseSha256,
    ndiLicenseSha256: info.ndiLicenseSha256,
    termsSha256: info.termsSha256,
    licenseText,
    pluginTerms,
  };
}

/**
 * The status of a plugin that answered with an object carrying string
 * `apiVersion` and `state`; null for anything else. Unknown states become
 * `error`, unknown error codes `internal_error`.
 */
export function sanitizeStatus(body: unknown): PluginStatus | null {
  if (!isRecord(body) || typeof body.apiVersion !== 'string' || typeof body.state !== 'string') {
    return null;
  }
  const known = (PLUGIN_STATES as readonly string[]).includes(body.state);
  const state: PluginState = known ? (body.state as PluginState) : 'error';
  const rawCode = body.errorCode;
  let errorCode: PluginStatus['errorCode'] = null;
  if (typeof rawCode === 'string') {
    errorCode = PLUGIN_ERRORS.includes(rawCode)
      ? (rawCode as PluginStatus['errorCode'])
      : 'internal_error';
  } else if (!known) {
    errorCode = 'internal_error';
  }
  const sdkVersion = typeof body.sdkVersion === 'string' ? body.sdkVersion : null;
  return {
    apiVersion: body.apiVersion.slice(0, MAX_API_VERSION),
    pluginVersion: text(body.pluginVersion, MAX_PLUGIN_VERSION) ?? '',
    state,
    errorCode,
    sdkVersion: sdkVersion !== null && SDK_VERSION.test(sdkVersion) ? sdkVersion : null,
    license: license(body.license),
    acceptance: acceptance(body.acceptance),
    arch: text(body.arch, 32) ?? '',
    encoders: [],
  };
}

function streamEntry(value: unknown): PluginStreamStatus | null {
  if (!isRecord(value) || typeof value.streamId !== 'string' || !UUID.test(value.streamId)) {
    return null;
  }
  const state = STREAM_STATES.includes(value.state as PluginStreamState)
    ? (value.state as PluginStreamState)
    : 'error';
  const fps =
    typeof value.fps === 'number' && Number.isFinite(value.fps) && value.fps >= 0
      ? Math.min(value.fps, MAX_FPS)
      : null;
  const dropped = value.framesDropped;
  const rawError = value.error;
  let error: PluginStreamErrorCode | null = null;
  if (typeof rawError === 'string') {
    error = (
      STREAM_ERRORS.includes(rawError) ? rawError : 'internal_error'
    ) as PluginStreamErrorCode;
  } else if (state === 'error' && rawError !== null) {
    error = 'internal_error';
  }
  return {
    streamId: value.streamId.toLowerCase(),
    state,
    sourceName: text(value.sourceName, MAX_SOURCE_NAME),
    encoder: text(value.encoder, MAX_ENCODER),
    fps,
    framesDropped:
      typeof dropped === 'number' && Number.isSafeInteger(dropped) && dropped >= 0 ? dropped : 0,
    error,
  };
}

/** The valid entries of a stream list, at most {@link MAX_STREAMS}; null when it is not a list. */
export function sanitizeStreams(body: unknown): PluginStreamStatus[] | null {
  if (!isRecord(body) || !Array.isArray(body.streams)) {
    return null;
  }
  const streams: PluginStreamStatus[] = [];
  for (const entry of body.streams) {
    const clean = streamEntry(entry);
    if (clean) {
      streams.push(clean);
    }
    if (streams.length >= MAX_STREAMS) {
      break;
    }
  }
  return streams;
}
