import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, filter, firstValueFrom, from, merge, take, timeout } from 'rxjs';
import { DashboardSseService, type DashboardEvent } from '../../dashboard/dashboard-sse.service';
import { generateSealedBoxKeyPair, open, seal, fromBase64, toBase64 } from './sealed-box';
import { readBackupPreview, type BackupPreview } from './backup-file';

/**
 * How long to wait for the agent. Deriving the key is deliberately slow (argon2
 * with 64 MiB), and a Raspberry Pi-class agent needs a few seconds for it.
 */
export const AGENT_ANSWER_TIMEOUT_MS = 120_000;

export interface ExportedBackup {
  password: string;
  file: Blob;
  fileName: string;
}

export interface BackupImportSummary {
  ssapRestored: number;
  devmodeKeysRestored: number;
  staleSsapScreenIds: string[];
  restored: { screenId: string; created: boolean; filled: string[] }[];
  skipped: { screenId: string; reason: string }[];
}

/** The agent (or the server on its behalf) refused; the message is the agent's. */
export class BackupAgentError extends Error {}

/**
 * Agent backups, end to end, from the dashboard's side.
 *
 * All the cryptography that has to happen here is about the *password*: the
 * file itself is sealed and opened on the agent. The password is generated on
 * the agent and sealed for a key pair that lives only in this tab; on import it
 * is sealed for a key the agent made for that one session. The server sees
 * neither in the clear.
 *
 * Each step is fire-and-wait: an HTTP call that answers 202, then the matching
 * event on the dashboard SSE stream.
 */
@Injectable({ providedIn: 'root' })
export class SiteAgentBackupService {
  private readonly http = inject(HttpClient);
  private readonly sse = inject(DashboardSseService);

  async export(agentId: string, agentName: string): Promise<ExportedBackup> {
    const keyPair = await generateSealedBoxKeyPair();
    const { response } = await this.dispatchAndAwait(
      this.sse.siteAgentBackupExport$,
      this.http.post<{ commandId: string }>(`/api/site-agents/${agentId}/backups/export`, {
        recipientPublicKey: keyPair.publicKey,
      }),
      (response, event) => event.data['commandId'] === response.commandId,
    );

    const result = await firstValueFrom(
      this.http.get<{ backup: string; sealedPassword: string }>(
        `/api/site-agents/${agentId}/backups/exports/${response.commandId}`,
      ),
    );
    return {
      password: await open(keyPair, result.sealedPassword),
      file: new Blob([fromBase64(result.backup)], { type: 'application/octet-stream' }),
      fileName: backupFileName(agentName, new Date()),
    };
  }

  /** Hands the file to the browser's download. Nothing is kept afterwards. */
  download(exported: ExportedBackup): void {
    const url = URL.createObjectURL(exported.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = exported.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Reads the header without the password, for the preview. Throws on a bad file. */
  async preview(file: Blob): Promise<BackupPreview> {
    return readBackupPreview(new Uint8Array(await file.arrayBuffer()));
  }

  async import(agentId: string, file: Blob, password: string): Promise<BackupImportSummary> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    readBackupPreview(bytes);

    const keyEvent = await this.dispatchAndAwait(
      this.sse.siteAgentBackupImportKey$,
      this.http.post<{ sessionId: string }>(
        `/api/site-agents/${agentId}/backups/import-sessions`,
        {},
      ),
      (response, event) => event.data['sessionId'] === response.sessionId,
    );
    const publicKey = keyEvent.event.data['publicKey'];
    if (typeof publicKey !== 'string') {
      throw new BackupAgentError(errorOf(keyEvent.event) ?? 'The agent sent no key');
    }

    const sessionId = keyEvent.response.sessionId;
    const done = await this.dispatchAndAwait(
      this.sse.siteAgentBackupImport$,
      this.http.post<{ commandId: string }>(`/api/site-agents/${agentId}/backups/import`, {
        sessionId,
        backup: toBase64(bytes),
        sealedPassword: await seal(publicKey, password),
      }),
      (_response, event) => event.data['sessionId'] === sessionId,
    );
    return done.event.data['summary'] as BackupImportSummary;
  }

  /**
   * Sends a request and waits for the SSE event that answers it.
   *
   * Listening starts before the request goes out: on a fast LAN the agent can
   * answer before the 202 is back, and an event that arrived while nobody was
   * listening would leave the dialog waiting until the timeout.
   */
  private async dispatchAndAwait<R>(
    stream: Subject<DashboardEvent>,
    request: Observable<R>,
    matches: (response: R, event: DashboardEvent) => boolean,
  ): Promise<{ response: R; event: DashboardEvent }> {
    const early: DashboardEvent[] = [];
    const buffering = stream.subscribe((event) => early.push(event));
    let response: R;
    try {
      response = await firstValueFrom(request);
    } finally {
      buffering.unsubscribe();
    }

    const event = await firstValueFrom(
      merge(from(early), stream).pipe(
        filter((candidate) => matches(response, candidate)),
        take(1),
        timeout(AGENT_ANSWER_TIMEOUT_MS),
      ),
    );
    const error = errorOf(event);
    if (error) {
      throw new BackupAgentError(error);
    }
    return { response, event };
  }
}

/** `<agent>-<yyyy-mm-dd>.mnsbackup`, with the name reduced to something every OS accepts. */
export function backupFileName(agentName: string, at: Date): string {
  const slug =
    agentName
      .toLowerCase()
      .normalize('NFKD')
      // Decomposed accents go first, so "Löwensaal" becomes "lowensaal", not "lo-wensaal".
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'site-agent';
  return `${slug}-${at.toISOString().slice(0, 10)}.mnsbackup`;
}

function errorOf(event: DashboardEvent): string | null {
  const error = event.data['error'];
  return typeof error === 'string' && error.length > 0 ? error : null;
}
