import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { CaptureLicenseTextUpload } from '../protocol/server-protocol';
import type { PluginClient } from './plugin-client';

/** First retry after a failed plugin or server call; doubles up to {@link MAX_BACKOFF_MS}. */
const INITIAL_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const sha256Hex = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** The part of the plugin client this class drives; specs pass a fake. */
export type LicensePluginPort = Pick<
  PluginClient,
  'snapshot' | 'onPoll' | 'poll' | 'putLicense' | 'deleteLicense' | 'getLicenseText'
>;

/** The part of the server client this class drives. */
export interface LicenseServerPort {
  putCaptureLicenseText(body: CaptureLicenseTextUpload): Promise<void>;
}

/** What the config says about the plugin's license; `undefined` means "no instruction". */
export type WantedAcceptance = { licenseSha256: string } | null | undefined;

/**
 * Keeps the capture plugin's license in line with the dashboard.
 *
 * - The server's acceptance (`config.ndiPlugin.acceptance`) is forwarded with
 *   `PUT /v1/license`; an explicitly removed one revokes an acceptance that was
 *   made through the API. An acceptance made through the plugin's environment
 *   is never touched, and a config without an instruction (older server, no
 *   config yet) changes nothing.
 * - The license texts the plugin ships are uploaded to the server once per
 *   process and hash, so the dashboard can show what an admin accepts. The plugin's
 *   text is untrusted: it must hash to what the plugin reported.
 *
 * Runs after every config refresh and after every plugin poll, so a plugin that
 * was absent, restarted or fails once catches up. Failures back off, so a
 * broken plugin or an unreachable server is not hit on every 2 s poll.
 */
export class CaptureLicenseSync {
  private readonly logger = new Logger(CaptureLicenseSync.name);
  private wanted: WantedAcceptance = undefined;
  private running: Promise<void> | null = null;
  private rerun = false;
  private readonly uploaded = new Set<string>();
  /** Hashes whose text is unusable (does not verify, too large): never retried. */
  private readonly rejected = new Set<string>();
  private textRetryAt = 0;
  private textBackoffMs = INITIAL_BACKOFF_MS;
  private licenseRetryAt = 0;
  private licenseBackoffMs = INITIAL_BACKOFF_MS;

  constructor(
    private readonly plugin: LicensePluginPort,
    private readonly server: LicenseServerPort,
    private readonly now: () => number = Date.now,
  ) {
    plugin.onPoll(() => void this.sync());
  }

  /** Remembers what the config wants and acts on it. */
  setWanted(wanted: WantedAcceptance): Promise<void> {
    this.wanted = wanted;
    this.licenseRetryAt = 0;
    return this.sync();
  }

  /** One pass; overlapping calls are merged into one rerun. */
  sync(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.rerun = false;
          await this.pass();
        } while (this.rerun);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  private async pass(): Promise<void> {
    const { state, status } = this.plugin.snapshot();
    if (!status || state === 'absent' || state === 'unknown' || state === 'incompatible') {
      return;
    }
    await this.uploadText(status.license?.licenseSha256 ?? null);
    await this.syncAcceptance();
  }

  private async uploadText(reportedHash: string | null): Promise<void> {
    if (
      !reportedHash ||
      this.uploaded.has(reportedHash) ||
      this.rejected.has(reportedHash) ||
      this.now() < this.textRetryAt
    ) {
      return;
    }
    try {
      const text = await this.plugin.getLicenseText();
      const upload = text && this.verified(text, reportedHash);
      if (!upload) {
        this.rejected.add(reportedHash);
        this.logger.error('The capture plugin returned a license text that does not verify');
        return;
      }
      await this.server.putCaptureLicenseText(upload);
      this.uploaded.add(reportedHash);
      this.textBackoffMs = INITIAL_BACKOFF_MS;
    } catch (error) {
      this.textRetryAt = this.now() + this.textBackoffMs;
      this.textBackoffMs = Math.min(this.textBackoffMs * 2, MAX_BACKOFF_MS);
      this.logger.warn(`Could not upload the capture license text: ${describe(error)}`);
    }
  }

  /** The upload body, or null when the texts do not hash to what the plugin reported. */
  private verified(
    text: NonNullable<Awaited<ReturnType<LicensePluginPort['getLicenseText']>>>,
    reportedHash: string,
  ): CaptureLicenseTextUpload | null {
    const ndiLicenseSha256 = sha256Hex(text.licenseText);
    const termsSha256 = sha256Hex(text.pluginTerms);
    if (
      text.licenseSha256 !== reportedHash ||
      text.ndiLicenseSha256 !== ndiLicenseSha256 ||
      text.termsSha256 !== termsSha256 ||
      sha256Hex(`${ndiLicenseSha256}\n${termsSha256}`) !== reportedHash
    ) {
      return null;
    }
    return {
      licenseSha256: reportedHash,
      ndiLicenseSha256,
      termsSha256,
      ndiLicenseText: text.licenseText,
      termsText: text.pluginTerms,
    };
  }

  /** A plugin that does not reflect the change in its next status must not be asked again at once. */
  private settleAfterChange(): void {
    this.licenseRetryAt = this.now() + INITIAL_BACKOFF_MS;
  }

  private async syncAcceptance(): Promise<void> {
    const wanted = this.wanted;
    const { status } = this.plugin.snapshot();
    if (wanted === undefined || !status || this.now() < this.licenseRetryAt) {
      return;
    }
    const accepted = status.acceptance;
    try {
      if (wanted === null) {
        if (accepted?.via === 'api') {
          await this.plugin.deleteLicense();
          this.settleAfterChange();
          await this.plugin.poll();
        }
      } else if (
        accepted === null &&
        status.license &&
        // Only the shipped hash can be accepted; anything else would be a 409 on every try.
        status.license.licenseSha256 === wanted.licenseSha256
      ) {
        await this.plugin.putLicense({
          sdkVersion: status.license.sdkVersion,
          licenseSha256: wanted.licenseSha256,
        });
        this.settleAfterChange();
        await this.plugin.poll();
      }
      this.licenseBackoffMs = INITIAL_BACKOFF_MS;
    } catch (error) {
      this.licenseRetryAt = this.now() + this.licenseBackoffMs;
      this.licenseBackoffMs = Math.min(this.licenseBackoffMs * 2, MAX_BACKOFF_MS);
      this.logger.warn(`Could not apply the capture license change: ${describe(error)}`);
    }
  }
}
