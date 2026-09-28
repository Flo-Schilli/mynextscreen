import * as net from 'node:net';
import { SmtpEmailProvider } from './smtp-email-provider';

/**
 * The unit spec mocks nodemailer wholesale, so it cannot notice a breaking
 * change in the library (the upgrade to nodemailer 10 was exactly that kind of
 * change). This spec talks to a real SMTP conversation on a throwaway socket:
 * if createTransport/sendMail ever stop delivering what SmtpEmailProvider asks
 * for, it fails here instead of in production.
 */

interface SmtpSink {
  port: number;
  messages: string[];
  authAttempts: number;
  close: () => Promise<void>;
}

/** Minimal SMTP server: enough of the protocol to accept one mail and keep it. */
async function startSmtpSink(): Promise<SmtpSink> {
  const messages: string[] = [];
  let authAttempts = 0;

  const server = net.createServer((socket) => {
    let inData = false;
    let body = '';

    socket.write('220 sink ESMTP\r\n');
    socket.on('error', () => socket.destroy());
    socket.on('data', (chunk: Buffer) => {
      const text = chunk.toString();

      if (inData) {
        body += text;
        if (body.includes('\r\n.\r\n')) {
          inData = false;
          messages.push(body);
          body = '';
          socket.write('250 OK queued\r\n');
        }
        return;
      }

      for (const line of text.split('\r\n').filter(Boolean)) {
        const command = line.toUpperCase();
        if (command.startsWith('EHLO') || command.startsWith('HELO')) {
          socket.write('250-sink\r\n250 AUTH PLAIN LOGIN\r\n');
        } else if (command.startsWith('AUTH')) {
          authAttempts += 1;
          socket.write('235 accepted\r\n');
        } else if (command.startsWith('DATA')) {
          inData = true;
          socket.write('354 go ahead\r\n');
        } else if (command.startsWith('QUIT')) {
          socket.write('221 bye\r\n');
          socket.end();
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('SMTP sink did not bind to a TCP port');
  }

  return {
    port: address.port,
    messages,
    get authAttempts() {
      return authAttempts;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe('SmtpEmailProvider (integration)', () => {
  let sink: SmtpSink;

  beforeEach(async () => {
    sink = await startSmtpSink();
  });

  afterEach(async () => {
    await sink.close();
  });

  it('delivers subject, text and html over a real SMTP conversation', async () => {
    const provider = new SmtpEmailProvider({
      host: '127.0.0.1',
      port: sink.port,
      user: null,
      password: null,
      secure: false,
      from: 'noreply@example.com',
    });

    await provider.sendMail({
      to: 'ops@example.com',
      subject: 'Screen offline',
      text: 'Lobby screen went offline.',
      html: '<p>Lobby screen went offline.</p>',
    });

    expect(sink.messages).toHaveLength(1);
    const raw = sink.messages[0];
    expect(raw).toContain('Screen offline');
    expect(raw).toContain('noreply@example.com');
    expect(raw).toContain('ops@example.com');
    expect(raw).toContain('Lobby screen went offline.');
    expect(raw).toContain('<p>Lobby screen went offline.</p>');
  });

  it('authenticates when credentials are configured', async () => {
    const provider = new SmtpEmailProvider({
      host: '127.0.0.1',
      port: sink.port,
      user: 'mailer@example.com',
      password: 'secret',
      secure: false,
      from: 'noreply@example.com',
    });

    await provider.sendMail({ to: 'ops@example.com', subject: 'Auth', text: 'body' });

    expect(sink.authAttempts).toBe(1);
    expect(sink.messages).toHaveLength(1);
  });
});
