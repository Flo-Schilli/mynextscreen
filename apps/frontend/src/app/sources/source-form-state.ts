import type { BadgeTone } from '../ui';
import {
  AdapterDescriptor,
  ContentSource,
  ContentSourceParams,
  ContentSourceSyncStatus,
  CreateContentSourceRequest,
  DEFAULT_SLIDE_STYLE,
  DEFAULT_SYNC_INTERVAL_MINUTES,
  ParamField,
  SlideFormat,
  SlideStyle,
  SYNC_INTERVAL_MAX_MINUTES,
  SYNC_INTERVAL_MIN_MINUTES,
  UpdateContentSourceRequest,
} from './content-source.model';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_NAME_LENGTH = 200;

/** Editable state of the source form; the adapter's params are keyed by field. */
export interface SourceFormValue {
  name: string;
  adapterType: string;
  params: Record<string, number>;
  formats: SlideFormat[];
  style: SlideStyle;
  syncIntervalMinutes: number;
  enabled: boolean;
}

/** Translation keys of the problems the form can have, in display order. */
export type SourceFormError =
  | 'nameRequired'
  | 'adapterRequired'
  | 'paramOutOfRange'
  | 'formatRequired'
  | 'accentColorInvalid'
  | 'intervalOutOfRange';

/** Defaults of every parameter the adapter declares. */
export function defaultParams(schema: readonly ParamField[]): Record<string, number> {
  return Object.fromEntries(schema.map((field) => [field.key, field.default]));
}

export function emptySourceForm(adapter: AdapterDescriptor | undefined): SourceFormValue {
  return {
    name: '',
    adapterType: adapter?.type ?? '',
    params: defaultParams(adapter?.paramsSchema ?? []),
    formats: ['1920x1080'],
    style: { ...DEFAULT_SLIDE_STYLE },
    syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
    enabled: true,
  };
}

/**
 * Seeds the form from a stored source. Stored params are kept only where they
 * are numbers of a declared field; missing ones fall back to the default.
 */
export function sourceFormFrom(
  source: ContentSource,
  adapter: AdapterDescriptor | undefined,
): SourceFormValue {
  const schema = adapter?.paramsSchema ?? [];
  const params = defaultParams(schema);
  for (const field of schema) {
    const stored = source.params[field.key];
    if (typeof stored === 'number') params[field.key] = stored;
  }
  return {
    name: source.name,
    adapterType: source.adapterType,
    params,
    formats: [...source.formats],
    style: { ...source.style },
    syncIntervalMinutes: source.syncIntervalMinutes,
    enabled: source.enabled,
  };
}

/** Switching the adapter resets the params to the new adapter's defaults. */
export function withAdapter(
  value: SourceFormValue,
  adapter: AdapterDescriptor | undefined,
): SourceFormValue {
  return {
    ...value,
    adapterType: adapter?.type ?? '',
    params: defaultParams(adapter?.paramsSchema ?? []),
  };
}

export function toggleFormat(formats: SlideFormat[], format: SlideFormat): SlideFormat[] {
  return formats.includes(format) ? formats.filter((f) => f !== format) : [...formats, format];
}

export function validateSourceForm(
  value: SourceFormValue,
  schema: readonly ParamField[],
): SourceFormError[] {
  const errors: SourceFormError[] = [];
  const name = value.name.trim();
  if (!name || name.length > MAX_NAME_LENGTH) errors.push('nameRequired');
  if (!value.adapterType) errors.push('adapterRequired');
  const paramInvalid = schema.some((field) => {
    const param = value.params[field.key];
    return !Number.isInteger(param) || param < field.min || param > field.max;
  });
  if (paramInvalid) errors.push('paramOutOfRange');
  if (value.formats.length === 0) errors.push('formatRequired');
  if (!HEX_COLOR.test(value.style.accentColor)) errors.push('accentColorInvalid');
  const interval = value.syncIntervalMinutes;
  if (
    !Number.isInteger(interval) ||
    interval < SYNC_INTERVAL_MIN_MINUTES ||
    interval > SYNC_INTERVAL_MAX_MINUTES
  ) {
    errors.push('intervalOutOfRange');
  }
  return errors;
}

function paramsOf(value: SourceFormValue, schema: readonly ParamField[]): ContentSourceParams {
  return Object.fromEntries(schema.map((field) => [field.key, value.params[field.key]]));
}

export function toCreateRequest(
  value: SourceFormValue,
  schema: readonly ParamField[],
): CreateContentSourceRequest {
  return {
    name: value.name.trim(),
    adapterType: value.adapterType,
    params: paramsOf(value, schema),
    formats: [...value.formats],
    style: { ...value.style },
    syncIntervalMinutes: value.syncIntervalMinutes,
    enabled: value.enabled,
  };
}

export function toUpdateRequest(
  value: SourceFormValue,
  schema: readonly ParamField[],
): UpdateContentSourceRequest {
  const request = toCreateRequest(value, schema);
  return {
    name: request.name,
    params: request.params,
    formats: request.formats,
    style: request.style,
    syncIntervalMinutes: request.syncIntervalMinutes,
    enabled: request.enabled,
  };
}

/** Badge tone of the last sync outcome; `null` means the source never synced. */
export function syncStatusTone(status: ContentSourceSyncStatus | null): BadgeTone {
  switch (status) {
    case 'success':
      return 'online';
    case 'partial':
      return 'warning';
    case 'failed':
      return 'offline';
    case 'running':
      return 'info';
    default:
      return 'neutral';
  }
}

/** `1920x1080` → `1920 × 1080`. */
export function formatLabel(format: SlideFormat): string {
  return format.replace('x', ' × ');
}

/**
 * The backend's message from an HttpErrorResponse body (`string` or
 * class-validator's `string[]`), or the fallback when there is none.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { error?: { message?: unknown } } | null)?.error;
  const message = body?.message;
  if (typeof message === 'string' && message) return message;
  if (Array.isArray(message) && message.every((m) => typeof m === 'string') && message.length) {
    return message.join(' ');
  }
  return fallback;
}
