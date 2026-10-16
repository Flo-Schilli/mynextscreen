import { ContentSourceAdapterRegistry, UnknownAdapterError } from './adapter.registry';
import { ConcertbueroFrankenAdapter } from './adapters/concertbuero-franken.adapter';

describe('ContentSourceAdapterRegistry', () => {
  const adapter = new ConcertbueroFrankenAdapter();
  const registry = new ContentSourceAdapterRegistry(adapter);

  it('resolves a registered adapter by type', () => {
    expect(registry.has('concertbuero-franken')).toBe(true);
    expect(registry.get('concertbuero-franken')).toBe(adapter);
  });

  it('throws for an unknown type', () => {
    expect(registry.has('nope')).toBe(false);
    expect(() => registry.get('nope')).toThrow(UnknownAdapterError);
  });

  it('describes adapters without exposing behaviour', () => {
    expect(registry.describe()).toEqual([
      {
        type: 'concertbuero-franken',
        label: 'Concertbüro Franken',
        paramsSchema: adapter.paramsSchema,
      },
    ]);
  });
});
