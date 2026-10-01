import { createServer, type Server } from 'node:http';
import { CommandStreamService } from './command-stream.service';
import type { SiteAgentCommandMessage } from '../protocol/server-protocol';

describe('CommandStreamService', () => {
  let service: CommandStreamService;
  let connections: { load: jest.Mock };
  let client: { eventsUrl: jest.Mock; authorization: jest.Mock; invalidateAccessToken: jest.Mock };
  let server: Server;
  let url: string;
  /** Pushes one raw SSE frame to whoever is connected. */
  let push: (frame: string) => void;
  let status = 200;

  beforeEach(async () => {
    status = 200;
    push = () => undefined;

    server = createServer((req, res) => {
      if (status !== 200) {
        res.writeHead(status);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      push = (frame: string) => res.write(frame);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    url = `http://127.0.0.1:${port}/events`;

    connections = { load: jest.fn().mockResolvedValue({ agentId: 'agent-1' }) };
    client = {
      eventsUrl: jest.fn().mockResolvedValue(url),
      authorization: jest.fn().mockResolvedValue('Bearer token'),
      invalidateAccessToken: jest.fn(),
    };
    service = new CommandStreamService(connections as never, client as never);
  });

  afterEach(async () => {
    service.onModuleDestroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function nextCommand(): Promise<SiteAgentCommandMessage> {
    return new Promise((resolve) => service.onCommand(resolve));
  }

  async function connected(): Promise<void> {
    service.onModuleInit();
    // Wait until the handler has installed a writer for this connection.
    for (let i = 0; i < 100 && push.toString().includes('undefined'); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  it('delivers a command to every handler', async () => {
    const received = nextCommand();
    await connected();

    push('data: {"commandId":"c1","type":"launch","screenId":"s1"}\n\n');

    expect(await received).toEqual({ commandId: 'c1', type: 'launch', screenId: 's1' });
  });

  it('reassembles a frame that arrives in pieces', async () => {
    const received = nextCommand();
    await connected();

    push('data: {"commandId":"c1",');
    await new Promise((resolve) => setTimeout(resolve, 20));
    push('"type":"wake"}\n\n');

    expect(await received).toMatchObject({ type: 'wake' });
  });

  it('delivers several commands in one chunk', async () => {
    const seen: SiteAgentCommandMessage[] = [];
    service.onCommand((command) => {
      seen.push(command);
    });
    await connected();

    push('data: {"commandId":"c1","type":"launch"}\n\ndata: {"commandId":"c2","type":"wake"}\n\n');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(seen.map((c) => c.commandId)).toEqual(['c1', 'c2']);
  });

  // A keepalive carries an empty data field; that it arrived is already proof
  // the connection is alive, so there is nothing to hand on.
  it('ignores keepalives', async () => {
    const handler = jest.fn();
    service.onCommand(handler);
    await connected();

    push('data: \n\n');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores a frame that is not JSON rather than dropping the stream', async () => {
    const handler = jest.fn();
    service.onCommand(handler);
    await connected();

    push('data: not json\n\n');
    push('data: {"commandId":"c1","type":"wake"}\n\n');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  // One failing handler must not tear down the stream for the others.
  it('keeps going when a handler throws', async () => {
    const good = jest.fn();
    service.onCommand(() => {
      throw new Error('boom');
    });
    service.onCommand(good);
    await connected();

    push('data: {"commandId":"c1","type":"wake"}\n\n');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(good).toHaveBeenCalled();
  });

  it('drops the access token when the stream is rejected', async () => {
    status = 401;
    service.onModuleInit();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(client.invalidateAccessToken).toHaveBeenCalled();
  });

  it('does not connect before the agent is enrolled', async () => {
    connections.load.mockResolvedValue(null);
    service.onModuleInit();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(client.eventsUrl).not.toHaveBeenCalled();
  });
});
