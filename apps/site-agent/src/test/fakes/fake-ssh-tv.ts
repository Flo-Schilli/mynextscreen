import { generateKeyPairSync } from 'node:crypto';
import { Server, type Connection } from 'ssh2';

export interface FakeSshTv {
  port: number;
  /** PEM of a key the fake accepts, encrypted with {@link passphrase}. */
  clientKeyPem: string;
  passphrase: string;
  /** Commands the fake was asked to run, in order. */
  commands: string[];
  /** What `exec` writes back; default is a successful Luna reply. */
  stdout: string;
  /** Set false to make every authentication attempt fail. */
  acceptAuth: boolean;
  close(): Promise<void>;
}

/**
 * Stands in for a webOS set's SSH daemon.
 *
 * Only public-key authentication is offered, as on a real set, and the exec
 * handler answers with the TV's own `{"returnValue":true}` so the "did the
 * extension work" check is exercised against the shape it really sees.
 *
 * It is pinned to the same legacy algorithms a webOS set offers — `ssh-rsa` and
 * SHA-1 key exchange — so the restrictive list in `SshService`, which is the
 * whole reason that service exists in this shape, is exercised rather than
 * bypassed. What a fake still cannot prove is that a real set offers exactly
 * these; `docs/site-agent.md` carries that as an explicit on-device check.
 */
export async function startFakeSshTv(passphrase = 'AEBC72'): Promise<FakeSshTv> {
  const hostKey = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  }).privateKey as string;

  const clientKeyPem = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    // PKCS#1 with a cipher, which is what the Developer Mode key server serves
    // and the only encrypted PEM form `ssh2` parses.
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase,
    },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  }).privateKey as string;

  const connections = new Set<Connection>();

  const fake: FakeSshTv = {
    port: 0,
    clientKeyPem,
    passphrase,
    commands: [],
    stdout: '{"returnValue":true}\n',
    acceptAuth: true,
    close: () =>
      new Promise<void>((resolve) => {
        // `close` only stops listening; an established session would otherwise
        // keep the event loop alive and hang the test run.
        for (const connection of connections) {
          connection.end();
        }
        server.close(() => resolve());
      }),
  };

  const server = new Server(
    {
      hostKeys: [hostKey],
      algorithms: {
        serverHostKey: ['ssh-rsa'],
        kex: ['diffie-hellman-group14-sha1'],
      },
    },
    (client: Connection) => {
      client.on('authentication', (ctx) => {
        if (ctx.method === 'publickey' && fake.acceptAuth) {
          ctx.accept();
          return;
        }
        ctx.reject(['publickey']);
      });

      client.on('ready', () => {
        client.on('session', (accept) => {
          const session = accept();
          session.on('exec', (acceptExec, _reject, info) => {
            fake.commands.push(info.command);
            const stream = acceptExec();
            stream.write(fake.stdout);
            stream.exit(0);
            stream.end();
          });
        });
      });

      // A fake that throws on a dropped connection would fail the test run with
      // an unhandled error rather than the assertion that matters.
      client.on('error', () => undefined);
      connections.add(client);
      client.on('close', () => connections.delete(client));
    },
  );

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  fake.port = typeof address === 'object' && address ? address.port : 0;
  return fake;
}
