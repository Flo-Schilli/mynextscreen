/**
 * Tests for the postMessage listener logic in ConnectionService.
 *
 * We extract the same filtering logic used in the service's onMessage handler
 * and test it directly with mock event objects, following the same pure-function
 * pattern used by player.service.spec.ts to avoid Angular DI and browser APIs.
 */

type ConnectFn = (serverUrl: string, apiKey: string) => void;

/**
 * Mirrors the onMessage handler registered by ConnectionService.
 * Returns a message event handler bound to the given connect function.
 */
function createPostMessageHandler(connectFn: ConnectFn): (event: { data: unknown }) => void {
  return (event: { data: unknown }): void => {
    const data = event.data;
    if (
      data == null ||
      typeof data !== 'object' ||
      (data as Record<string, unknown>).type !== 'signage-connect'
    ) {
      return;
    }

    const { serverUrl, apiKey } = data as Record<string, unknown>;
    if (typeof serverUrl !== 'string' || !serverUrl || typeof apiKey !== 'string' || !apiKey) {
      return;
    }

    connectFn(serverUrl, apiKey);
  };
}

describe('ConnectionService postMessage listener', () => {
  let connectFn: ReturnType<typeof vi.fn>;
  let handler: (event: { data: unknown }) => void;

  beforeEach(() => {
    connectFn = vi.fn();
    handler = createPostMessageHandler(connectFn);
  });

  it('should call connect when receiving a valid signage-connect message', () => {
    handler({
      data: { type: 'signage-connect', serverUrl: 'https://example.com', apiKey: 'key-123' },
    });

    expect(connectFn).toHaveBeenCalledWith('https://example.com', 'key-123');
    expect(connectFn).toHaveBeenCalledTimes(1);
  });

  it('should ignore messages with wrong type', () => {
    handler({ data: { type: 'other-event', serverUrl: 'https://x.com', apiKey: 'k' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages with no type', () => {
    handler({ data: { serverUrl: 'https://x.com', apiKey: 'k' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages with missing serverUrl', () => {
    handler({ data: { type: 'signage-connect', apiKey: 'key-123' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages with missing apiKey', () => {
    handler({ data: { type: 'signage-connect', serverUrl: 'https://example.com' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages with empty serverUrl', () => {
    handler({ data: { type: 'signage-connect', serverUrl: '', apiKey: 'key-123' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages with empty apiKey', () => {
    handler({ data: { type: 'signage-connect', serverUrl: 'https://example.com', apiKey: '' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore non-object messages', () => {
    handler({ data: 'plain string' });
    handler({ data: 42 });
    handler({ data: null });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages where serverUrl is not a string', () => {
    handler({ data: { type: 'signage-connect', serverUrl: 123, apiKey: 'key' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages where apiKey is not a string', () => {
    handler({ data: { type: 'signage-connect', serverUrl: 'https://x.com', apiKey: true } });
    expect(connectFn).not.toHaveBeenCalled();
  });
});
