import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  catchError,
  concat,
  filter,
  firstValueFrom,
  from,
  map,
  merge,
  of,
  take,
  timeout,
} from 'rxjs';
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

export type BackupOperationStep =
  | 'exporting'
  | 'waiting_for_agent'
  | 'waiting_for_file'
  | 'decrypting'
  | 'waiting_for_mapping'
  | 'applying';

/** The backup running on an agent, as every admin's tab sees it. */
export interface BackupOperation {
  kind: 'export' | 'import';
  id: string;
  step: BackupOperationStep;
  startedBy: { userId: string; name: string };
  startedAt: string;
}

export type BackupEntryStatus = 'fill' | 'create' | 'other_agent' | 'not_found';

export interface BackupPlanEntry {
  screenId: string;
  backupName: string | null;
  status: BackupEntryStatus;
  screenName: string | null;
  ownerAgentName: string | null;
}

export interface BackupTarget {
  screenId: string;
  name: string;
  selectable: boolean;
  ownerAgentName: string | null;
}

export interface BackupImportPlan {
  sourceAgentId: string;
  entries: BackupPlanEntry[];
  targets: BackupTarget[];
}

export interface BackupMapping {
  from: string;
  to: string;
}

export interface OpenedImport {
  sessionId: string;
  plan: BackupImportPlan;
}

export interface BackupImportSummary {
  ssapRestored: number;
  devmodeKeysRestored: number;
  staleSsapScreenIds: string[];
  restored: {
    screenId: string;
    sourceScreenId: string;
    created: boolean;
    mapped: boolean;
    fields: string[];
  }[];
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
 * An import has two halves: {@link openImport} gets the file opened on the
 * agent and returns what each entry would do; {@link applyImport} sends the
 * operator's mapping and returns what was restored. Each step is fire-and-wait:
 * an HTTP call that answers 202, then the matching event on the SSE stream.
 */
@Injectable({ providedIn: 'root' })
export class SiteAgentBackupService {
  private readonly http = inject(HttpClient);
  private readonly sse = inject(DashboardSseService);

  /**
   * The backup running on an agent: the current state first, then every change
   * as it is announced. Null when nothing runs. A failed first read counts as
   * "nothing known yet" rather than an error; the stream still follows.
   */
  operation$(agentId: string): Observable<BackupOperation | null> {
    const initial = this.http
      .get<BackupOperation | null>(`/api/site-agents/${agentId}/backups/status`)
      .pipe(catchError(() => of(null)));
    const updates = this.sse.siteAgentBackupProgress$.pipe(
      filter((event) => event.data['agentId'] === agentId),
      map((event) => (event.data['operation'] as BackupOperation | null) ?? null),
    );
    return concat(initial, updates);
  }

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

  /**
   * Phase one: the agent opens the file and the server plans it. Ends with the
   * plan, before anything is written — the operator maps what needs mapping.
   */
  async openImport(agentId: string, file: Blob, password: string): Promise<OpenedImport> {
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
    // A failure while opening arrives as the import's final event, success as
    // "analysed"; whichever comes first for this session answers.
    await this.dispatchAndAwait(
      merge(this.sse.siteAgentBackupImportAnalysed$, this.sse.siteAgentBackupImport$),
      this.http.post<{ commandId: string }>(`/api/site-agents/${agentId}/backups/import`, {
        sessionId,
        backup: toBase64(bytes),
        sealedPassword: await seal(publicKey, password),
      }),
      (_response, event) => event.data['sessionId'] === sessionId,
    );

    const plan = await firstValueFrom(
      this.http.get<BackupImportPlan>(
        `/api/site-agents/${agentId}/backups/imports/${sessionId}/plan`,
      ),
    );
    return { sessionId, plan };
  }

  /** Phase two: the mapping goes to the server, the agent restores. */
  async applyImport(
    agentId: string,
    sessionId: string,
    mappings: BackupMapping[],
  ): Promise<BackupImportSummary> {
    const done = await this.dispatchAndAwait(
      this.sse.siteAgentBackupImport$,
      this.http.post<{ commandId: string }>(
        `/api/site-agents/${agentId}/backups/imports/${sessionId}/apply`,
        { mappings },
      ),
      (_response, event) => event.data['sessionId'] === sessionId,
    );
    return done.event.data['summary'] as BackupImportSummary;
  }

  /**
   * Abandons an opened import, freeing the agent for the next one. Best effort:
   * if it fails, the server lets the operation lapse after ten minutes anyway.
   */
  async cancelImport(agentId: string, sessionId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`/api/site-agents/${agentId}/backups/imports/${sessionId}`),
    ).catch(() => undefined);
  }

  /**
   * Sends a request and waits for the SSE event that answers it.
   *
   * Listening starts before the request goes out: on a fast LAN the agent can
   * answer before the 202 is back, and an event that arrived while nobody was
   * listening would leave the dialog waiting until the timeout.
   */
  private async dispatchAndAwait<R>(
    stream: Observable<DashboardEvent>,
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
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'site-agent';
  return `${slug}-${at.toISOString().slice(0, 10)}.mnsbackup`;
}

function errorOf(event: DashboardEvent): string | null {
  const error = event.data['error'];
  return typeof error === 'string' && error.length > 0 ? error : null;
}
