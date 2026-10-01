import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Client, type ConnectConfig } from 'ssh2';
import type { SshStatusValue } from '../protocol/server-protocol';

/** Developer Mode exposes SSH here, as the jailed `prisoner` user. */
export const SSH_PORT = 9922;
export const SSH_USER = 'prisoner';

const CONNECT_TIMEOUT_MS = 8_000;
const COMMAND_TIMEOUT_MS = 15_000;

/**
 * The call that actually extends the Developer Mode session, over the public
 * Luna bus. This is what the *Extend Session Time* button on the TV does.
 *
 * The same call over SSAP is acked with `returnValue: true` and does nothing —
 * the parameters never reach the app. That was verified on a real set; do not
 * move this back onto the SSAP client.
 */
export const EXTEND_DEVMODE_COMMAND =
  `luna-send-pub -n 1 luna://com.webos.applicationManager/launch ` +
  `'{"id":"com.palmdts.devmode","subscribe":false,"params":{"extend":true}}'`;

export interface SshResult {
  status: SshStatusValue;
  stdout?: string;
  detail?: string;
  /** Present on a successful connect, for first-use pinning. */
  hostKeyFingerprint?: string;
}

export interface SshTarget {
  host: string;
  privateKey: string;
  passphrase: string;
  /** Pinned from a previous connect; null means trust this one and record it. */
  expectedHostKeyFingerprint: string | null;
  /** Developer Mode always uses {@link SSH_PORT}; overridable for tests. */
  port?: number;
}

/**
 * Runs one command on a TV over SSH.
 *
 * Uses `ssh2` rather than the `ssh` binary for three reasons that all matter
 * here: the encrypted key is handed over in process so no decrypted copy is
 * ever written to disk; `ssh-rsa` is implemented in JavaScript, so the host's
 * OpenSSL crypto policy — which on Fedora refuses SHA-1 signatures and breaks
 * `ssh` against these sets entirely — is irrelevant; and the image needs no
 * `openssh-client`.
 *
 * The algorithm lists are explicit because the TV runs OpenSSH 6.1 and offers
 * nothing modern. `ssh2` has these off by default, for good reasons that do not
 * apply to a 2014-era television on a venue LAN.
 */
@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);

  async run(target: SshTarget, command: string): Promise<SshResult> {
    let seenFingerprint: string | null = null;
    let mismatch = false;

    const config: ConnectConfig = {
      host: target.host,
      port: target.port ?? SSH_PORT,
      username: SSH_USER,
      privateKey: target.privateKey,
      passphrase: target.passphrase,
      readyTimeout: CONNECT_TIMEOUT_MS,
      algorithms: {
        serverHostKey: ['ssh-rsa'],
        kex: ['diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
      },
      hostVerifier: (key: Buffer) => {
        seenFingerprint = fingerprint(key);
        if (!target.expectedHostKeyFingerprint) {
          // Trust on first use. The alternative is an operator who cannot
          // onboard a TV without reading a fingerprint off the set, which no
          // webOS screen offers a way to do.
          return true;
        }
        mismatch = seenFingerprint !== target.expectedHostKeyFingerprint;
        return !mismatch;
      },
    };

    try {
      const stdout = await this.exec(config, command);
      return { status: 'ok', stdout, hostKeyFingerprint: seenFingerprint ?? undefined };
    } catch (error) {
      if (mismatch) {
        // A factory reset is the benign cause. The other one is worth a human
        // looking at it, so this is never accepted silently.
        this.logger.error(`Host key changed for ${target.host} — refusing to connect`);
        return {
          status: 'host_key_mismatch',
          detail: `Expected ${target.expectedHostKeyFingerprint}, got ${seenFingerprint}`,
        };
      }
      return { status: classify(error), detail: describe(error) };
    }
  }

  /** Extends the Developer Mode session. Success is the TV's own return value. */
  async extendDevmode(target: SshTarget): Promise<SshResult & { extended: boolean }> {
    const result = await this.run(target, EXTEND_DEVMODE_COMMAND);
    return { ...result, extended: (result.stdout ?? '').includes('"returnValue":true') };
  }

  private exec(config: ConnectConfig, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = new Client();
      const timer = setTimeout(() => {
        client.end();
        reject(new Error(`SSH command timed out after ${COMMAND_TIMEOUT_MS}ms`));
      }, COMMAND_TIMEOUT_MS);

      const finish = (error: Error | null, output?: string): void => {
        clearTimeout(timer);
        client.end();
        if (error) {
          reject(error);
        } else {
          resolve(output ?? '');
        }
      };

      client.on('ready', () => {
        client.exec(command, (error, stream) => {
          if (error) {
            finish(error);
            return;
          }
          let output = '';
          stream.on('data', (chunk: Buffer) => {
            output += chunk.toString();
          });
          stream.stderr.on('data', (chunk: Buffer) => {
            output += chunk.toString();
          });
          stream.on('close', () => finish(null, output));
        });
      });

      client.on('error', (error) => finish(error));
      client.connect(config);
    });
  }
}

/** The same form OpenSSH prints, so a fingerprint can be compared by eye. */
function fingerprint(key: Buffer): string {
  return `SHA256:${createHash('sha256').update(key).digest('base64').replace(/=+$/, '')}`;
}

/**
 * Only the authentication failure is worth telling apart: it is the one the
 * operator can act on, by re-fetching the key after Developer Mode was switched
 * on again. Everything else is the set not answering, and a finer taxonomy
 * would be guesswork over `ssh2`'s error strings.
 */
function classify(error: unknown): SshStatusValue {
  const message = describe(error);
  const authFailed =
    /All configured authentication methods failed|authentication|Cannot parse privateKey|Encrypted private OpenSSH key detected/i.test(
      message,
    );
  return authFailed ? 'auth_failed' : 'unreachable';
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
