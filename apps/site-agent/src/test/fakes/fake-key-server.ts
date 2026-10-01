import { createServer, type Server } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';

export interface FakeKeyServer {
  port: number;
  /** The encrypted PEM this server hands out. */
  pem: string;
  passphrase: string;
  close(): Promise<void>;
}

/**
 * Stands in for the Developer Mode app's key server on port 9991.
 *
 * Generates a real passphrase-encrypted RSA key, so the decrypt check in
 * `DevmodeKeyService` is exercised for real rather than mocked — that check is
 * what tells "wrong passphrase" apart from "the TV is not there", which is the
 * difference the onboarding wizard shows the operator.
 */
export async function startFakeKeyServer(passphrase = 'AEBC72'): Promise<FakeKeyServer> {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    // PKCS#1 with a cipher: the form the real key server serves, and the only
    // encrypted PEM `ssh2` can parse downstream.
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase,
    },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  const pem = privateKey as string;

  const server: Server = createServer((req, res) => {
    if (req.url === '/webos_rsa') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(pem);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return {
    port,
    pem,
    passphrase,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
