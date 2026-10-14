import { AdapterDescriptor, ContentSource } from './content-source.model';
import {
  apiErrorMessage,
  emptySourceForm,
  formatLabel,
  sourceFormFrom,
  syncStatusTone,
  toCreateRequest,
  toUpdateRequest,
  toggleFormat,
  validateSourceForm,
  withAdapter,
} from './source-form-state';

const ADAPTER: AdapterDescriptor = {
  type: 'concertbuero-franken',
  label: 'Concertbüro Franken',
  paramsSchema: [
    {
      key: 'monthsAhead',
      type: 'integer',
      label: 'Months ahead',
      labelKey: 'sources.form.params.monthsAhead',
      min: 1,
      max: 24,
      default: 6,
    },
  ],
};

function buildSource(overrides: Partial<ContentSource> = {}): ContentSource {
  return {
    id: 's1',
    organisationId: 'org1',
    name: 'Concertbüro',
    adapterType: ADAPTER.type,
    params: { monthsAhead: 3 },
    formats: ['1920x1080', '1080x1920'],
    style: { background: 'blur', accentColor: '#112233' },
    syncIntervalMinutes: 60,
    enabled: false,
    nextSyncAt: null,
    lastSyncAt: null,
    lastSyncStatus: null,
    lastSyncError: null,
    lastSyncSummary: null,
    venueAliases: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('source form state', () => {
  it('starts a new form with the adapter defaults and one landscape format', () => {
    const form = emptySourceForm(ADAPTER);

    expect(form.adapterType).toBe(ADAPTER.type);
    expect(form.params).toEqual({ monthsAhead: 6 });
    expect(form.formats).toEqual(['1920x1080']);
    expect(form.enabled).toBe(true);
  });

  it('seeds from a source, keeping only numeric params of declared fields', () => {
    const form = sourceFormFrom(
      buildSource({ params: { monthsAhead: 3, stray: 'x', legacy: 9 } }),
      ADAPTER,
    );

    expect(form.params).toEqual({ monthsAhead: 3 });
    expect(form.style).toEqual({ background: 'blur', accentColor: '#112233' });
    expect(form.enabled).toBe(false);
  });

  it('falls back to the default for a stored param that is not a number', () => {
    const form = sourceFormFrom(buildSource({ params: { monthsAhead: 'three' } }), ADAPTER);

    expect(form.params).toEqual({ monthsAhead: 6 });
  });

  it('resets params when the adapter changes', () => {
    const form = { ...emptySourceForm(ADAPTER), params: { monthsAhead: 12 } };

    expect(withAdapter(form, undefined)).toMatchObject({ adapterType: '', params: {} });
    expect(withAdapter(form, ADAPTER).params).toEqual({ monthsAhead: 6 });
  });

  it('toggles a format on and off', () => {
    expect(toggleFormat(['1920x1080'], '1080x1920')).toEqual(['1920x1080', '1080x1920']);
    expect(toggleFormat(['1920x1080', '1080x1920'], '1920x1080')).toEqual(['1080x1920']);
  });

  it('accepts a complete form', () => {
    const form = { ...emptySourceForm(ADAPTER), name: 'Concertbüro' };

    expect(validateSourceForm(form, ADAPTER.paramsSchema)).toEqual([]);
  });

  it('reports every problem of an incomplete form in display order', () => {
    const form = {
      ...emptySourceForm(undefined),
      params: { monthsAhead: 30 },
      formats: [],
      style: { background: 'black' as const, accentColor: 'red' },
      syncIntervalMinutes: 5,
    };

    expect(validateSourceForm(form, ADAPTER.paramsSchema)).toEqual([
      'nameRequired',
      'adapterRequired',
      'paramOutOfRange',
      'formatRequired',
      'accentColorInvalid',
      'intervalOutOfRange',
    ]);
  });

  it('rejects a half-typed (NaN) number', () => {
    const form = {
      ...emptySourceForm(ADAPTER),
      name: 'x',
      params: { monthsAhead: Number.NaN },
      syncIntervalMinutes: Number.NaN,
    };

    expect(validateSourceForm(form, ADAPTER.paramsSchema)).toEqual([
      'paramOutOfRange',
      'intervalOutOfRange',
    ]);
  });

  it('builds the create request with a trimmed name and only declared params', () => {
    const form = {
      ...emptySourceForm(ADAPTER),
      name: '  Concertbüro  ',
      params: { monthsAhead: 4, stray: 1 },
    };

    expect(toCreateRequest(form, ADAPTER.paramsSchema)).toEqual({
      name: 'Concertbüro',
      adapterType: ADAPTER.type,
      params: { monthsAhead: 4 },
      formats: ['1920x1080'],
      style: { background: 'black', accentColor: '#e30613' },
      syncIntervalMinutes: 360,
      enabled: true,
    });
  });

  it('leaves the adapter type out of an update', () => {
    const update = toUpdateRequest(sourceFormFrom(buildSource(), ADAPTER), ADAPTER.paramsSchema);

    expect(update).not.toHaveProperty('adapterType');
    expect(update).toMatchObject({ name: 'Concertbüro', params: { monthsAhead: 3 } });
  });

  it('maps the sync status to a badge tone', () => {
    expect(syncStatusTone('success')).toBe('online');
    expect(syncStatusTone('partial')).toBe('warning');
    expect(syncStatusTone('failed')).toBe('offline');
    expect(syncStatusTone('running')).toBe('info');
    expect(syncStatusTone(null)).toBe('neutral');
  });

  it('formats a slide size for display', () => {
    expect(formatLabel('1080x1920')).toBe('1080 × 1920');
  });

  it('reads the backend message from an error, joining validation messages', () => {
    expect(apiErrorMessage({ error: { message: 'Unknown adapter' } }, 'fallback')).toBe(
      'Unknown adapter',
    );
    expect(apiErrorMessage({ error: { message: ['a is bad', 'b is bad'] } }, 'fallback')).toBe(
      'a is bad b is bad',
    );
    expect(apiErrorMessage({ error: 'boom' }, 'fallback')).toBe('fallback');
    expect(apiErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
