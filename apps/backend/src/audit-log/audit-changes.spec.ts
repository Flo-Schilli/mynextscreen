import { auditChanges, sortedIds, withoutUrlCredentials } from './audit-changes';

describe('auditChanges', () => {
  it('records old and new value of each field that changed', () => {
    const changes = auditChanges(
      { name: 'Foyer', location: 'Hall' },
      { name: 'Lobby', location: 'Hall' },
      ['name', 'location'],
    );

    expect(changes).toEqual({ name: { from: 'Foyer', to: 'Lobby' } });
  });

  it('leaves out fields sent with their current value', () => {
    expect(
      auditChanges({ priority: 2, rrule: null }, { priority: 2, rrule: null }, [
        'priority',
        'rrule',
      ]),
    ).toEqual({});
  });

  it('writes dates as ISO strings and treats undefined as null', () => {
    const changes = auditChanges(
      { startTime: new Date('2026-10-26T18:00:00Z'), location: undefined as string | undefined },
      { startTime: new Date('2026-10-26T19:00:00Z'), location: 'Hall' },
      ['startTime', 'location'],
    );

    expect(changes).toEqual({
      startTime: { from: '2026-10-26T18:00:00.000Z', to: '2026-10-26T19:00:00.000Z' },
      location: { from: null, to: 'Hall' },
    });
  });

  it('compares lists and objects by value', () => {
    const changes = auditChanges(
      { venues: ['A', 'B'], style: { theme: 'dark' } },
      { venues: ['A', 'B'], style: { theme: 'light' } },
      ['venues', 'style'],
    );

    expect(changes).toEqual({ style: { from: { theme: 'dark' }, to: { theme: 'light' } } });
  });

  it('records a hidden field as changed without its values', () => {
    const changes = auditChanges({ secret: 'old' }, { secret: 'new' }, ['secret'], {
      hidden: ['secret'],
    });

    expect(changes).toEqual({ secret: {} });
  });

  it('applies a field mapper before comparing', () => {
    const changes = auditChanges(
      { url: 'rtsp://a:b@cam/1' },
      { url: 'rtsp://c:d@cam/1' },
      ['url'],
      { map: { url: withoutUrlCredentials } },
    );

    expect(changes).toEqual({});
  });
});

describe('withoutUrlCredentials', () => {
  it('masks user and password', () => {
    expect(withoutUrlCredentials('rtsp://admin:secret@10.0.0.5:554/live')).toBe(
      'rtsp://***@10.0.0.5:554/live',
    );
  });

  it('keeps a URL without credentials as it is', () => {
    expect(withoutUrlCredentials('https://example.com/stream.m3u8')).toBe(
      'https://example.com/stream.m3u8',
    );
  });

  it('keeps non-strings and unparsable values', () => {
    expect(withoutUrlCredentials(null)).toBeNull();
    expect(withoutUrlCredentials('not a url')).toBe('not a url');
  });
});

describe('sortedIds', () => {
  it('ignores the order of an id list', () => {
    const changes = auditChanges(
      { screenIds: ['b', 'a'] },
      { screenIds: ['a', 'b'] },
      ['screenIds'],
      {
        map: { screenIds: sortedIds },
      },
    );

    expect(changes).toEqual({});
  });
});
