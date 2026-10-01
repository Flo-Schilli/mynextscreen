import { createServer, type Server } from 'node:net';
import { ReachabilityService } from './reachability.service';

describe('ReachabilityService', () => {
  const service = new ReachabilityService();
  let server: Server;
  let port: number;

  beforeAll(async () => {
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    port = typeof address === 'object' && address ? address.port : 0;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('reports a listening port as reachable', async () => {
    expect(await service.probe('127.0.0.1', port)).toEqual({ reachability: 'reachable' });
  });

  it('reports a refused port as unreachable, with the reason', async () => {
    const result = await service.probe('127.0.0.1', 1);

    expect(result.reachability).toBe('unreachable');
    expect(result.detail).toContain('127.0.0.1:1');
  });

  // "No address configured" is not the same as "the TV is off": one is a
  // missing setting, the other is a device state.
  it('reports unknown when no address is configured', async () => {
    const result = await service.probe(null, 3001);

    expect(result.reachability).toBe('unknown');
    expect(result.detail).toMatch(/No address/);
  });

  it('settles exactly once', async () => {
    const results = await Promise.all([
      service.probe('127.0.0.1', port),
      service.probe('127.0.0.1', 1),
    ]);

    expect(results.map((r) => r.reachability)).toEqual(['reachable', 'unreachable']);
  });
});
