import { WebSocketServer, type WebSocket } from 'ws';

export interface FakeSsapTv {
  port: number;
  /** Commands the fake received, in order. */
  launched: string[];
  /** Set to null to make the TV demand a pairing prompt that never resolves. */
  grantKey: string | null;
  foregroundAppId: string | null;
  /** What `listApps` answers with; shaped like the real payload. */
  installedApps: { id: string; version?: unknown }[];
  close(): Promise<void>;
}

/**
 * Stands in for an LG set's SSAP endpoint.
 *
 * Plain `ws` rather than TLS: the client's TLS opt-out is a per-socket option
 * that a self-signed certificate here would only re-test, while the handshake,
 * the client-key exchange and the request correlation are the parts worth
 * covering.
 */
export async function startFakeSsapTv(): Promise<FakeSsapTv> {
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });

  const fake: FakeSsapTv = {
    port: 0,
    launched: [],
    grantKey: 'granted-key',
    foregroundAppId: 'com.webos.app.livetv',
    installedApps: [{ id: 'com.mynextscreen.webos', version: '0.15.0' }],
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };

  server.on('connection', (socket: WebSocket) => {
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString()) as {
        id: string;
        type: string;
        uri?: string;
        payload?: Record<string, unknown>;
      };

      if (message.type === 'register') {
        const hadKey = typeof message.payload?.['client-key'] === 'string';
        if (!hadKey) {
          // Real sets answer the prompt first, then register once it is
          // confirmed. The client has to tolerate both messages on one id.
          socket.send(
            JSON.stringify({
              id: message.id,
              type: 'response',
              payload: { pairingType: 'PROMPT' },
            }),
          );
        }
        if (fake.grantKey === null) {
          return; // Prompt never confirmed.
        }
        socket.send(
          JSON.stringify({
            id: message.id,
            type: 'registered',
            payload: { 'client-key': fake.grantKey },
          }),
        );
        return;
      }

      if (message.uri?.includes('getForegroundAppInfo')) {
        socket.send(
          JSON.stringify({
            id: message.id,
            type: 'response',
            payload: { returnValue: true, appId: fake.foregroundAppId },
          }),
        );
        return;
      }

      if (message.uri?.includes('applicationManager/listApps')) {
        socket.send(
          JSON.stringify({
            id: message.id,
            type: 'response',
            payload: { returnValue: true, apps: fake.installedApps },
          }),
        );
        return;
      }

      if (message.uri?.includes('system.launcher/launch')) {
        fake.launched.push(String(message.payload?.id));
        socket.send(
          JSON.stringify({ id: message.id, type: 'response', payload: { returnValue: true } }),
        );
        return;
      }

      socket.send(
        JSON.stringify({ id: message.id, type: 'error', error: `unhandled ${message.uri}` }),
      );
    });
  });

  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  fake.port = typeof address === 'object' && address ? address.port : 0;
  return fake;
}
