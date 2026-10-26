import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardSseService, type DashboardEvent } from '../../dashboard/dashboard-sse.service';
import {
  BackupAgentError,
  SiteAgentBackupService,
  backupFileName,
} from './site-agent-backup.service';
import { generateSealedBoxKeyPair, open, seal, toBase64 } from './sealed-box';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const AGENT = 'agent-1';

function event(type: string, data: Record<string, unknown>): DashboardEvent {
  return { type, data, timestamp: new Date().toISOString() };
}

/** A file with a valid header, which is all the dashboard ever reads of one. */
function backupFile(): Blob {
  const header = new TextEncoder().encode(
    JSON.stringify({
      organisationId: 'org-1',
      sourceAgentId: AGENT,
      createdAt: '2026-10-26T12:00:00.000Z',
      agentVersion: '0.30.0',
      screenCount: 1,
    }),
  );
  const prefix = new Uint8Array([
    ...new TextEncoder().encode('MNSBAK'),
    1,
    header.length >> 8,
    header.length & 0xff,
  ]);
  return new Blob([prefix, header, new Uint8Array(32)]);
}

describe('SiteAgentBackupService', () => {
  let service: SiteAgentBackupService;
  let http: HttpTestingController;
  let sse: {
    siteAgentBackupExport$: Subject<DashboardEvent>;
    siteAgentBackupImportKey$: Subject<DashboardEvent>;
    siteAgentBackupImport$: Subject<DashboardEvent>;
    siteAgentBackupImportAnalysed$: Subject<DashboardEvent>;
    siteAgentBackupProgress$: Subject<DashboardEvent>;
  };

  beforeEach(() => {
    sse = {
      siteAgentBackupExport$: new Subject(),
      siteAgentBackupImportKey$: new Subject(),
      siteAgentBackupImport$: new Subject(),
      siteAgentBackupImportAnalysed$: new Subject(),
      siteAgentBackupProgress$: new Subject(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DashboardSseService, useValue: sse },
      ],
    });
    service = TestBed.inject(SiteAgentBackupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  /** Requests go out after async crypto, so wait for them to appear. */
  async function nextRequest(url: string): Promise<TestRequest> {
    let request: TestRequest | undefined;
    await vi.waitFor(() => {
      request = http.expectOne(url);
    });
    return request as TestRequest;
  }

  describe('export', () => {
    it('opens the password the agent sealed for this tab and returns the file', async () => {
      const result = service.export(AGENT, 'Löwensaal Nord');

      const start = await nextRequest(`/api/site-agents/${AGENT}/backups/export`);
      const tabKey = start.request.body.recipientPublicKey as string;
      start.flush({ commandId: 'cmd-1' });
      await Promise.resolve();
      sse.siteAgentBackupExport$.next(
        event('site_agent.backup-export', { commandId: 'cmd-1', error: null }),
      );

      const collect = await nextRequest(`/api/site-agents/${AGENT}/backups/exports/cmd-1`);
      collect.flush({
        backup: toBase64(new Uint8Array([1, 2, 3])),
        sealedPassword: await seal(tabKey, 'K7QM-2XRA-9PDF-T4HN-WB6C-ZJ3E'),
      });

      const exported = await result;
      expect(exported.password).toBe('K7QM-2XRA-9PDF-T4HN-WB6C-ZJ3E');
      expect(new Uint8Array(await exported.file.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
      expect(exported.fileName).toMatch(/^lowensaal-nord-\d{4}-\d{2}-\d{2}\.mnsbackup$/);
    });

    it('catches an answer that arrives before the 202 does', async () => {
      const result = service.export(AGENT, 'Venue');

      const start = await nextRequest(`/api/site-agents/${AGENT}/backups/export`);
      sse.siteAgentBackupExport$.next(
        event('site_agent.backup-export', { commandId: 'cmd-early', error: 'disk full' }),
      );
      start.flush({ commandId: 'cmd-early' });

      await expect(result).rejects.toThrow(new BackupAgentError('disk full'));
    });

    it('ignores answers meant for another tab', async () => {
      const result = service.export(AGENT, 'Venue');

      const start = await nextRequest(`/api/site-agents/${AGENT}/backups/export`);
      start.flush({ commandId: 'mine' });
      await Promise.resolve();
      sse.siteAgentBackupExport$.next(
        event('site_agent.backup-export', { commandId: 'theirs', error: 'not for me' }),
      );
      sse.siteAgentBackupExport$.next(
        event('site_agent.backup-export', { commandId: 'mine', error: 'for me' }),
      );

      await expect(result).rejects.toThrow('for me');
    });

    it('passes on an HTTP failure such as an offline agent', async () => {
      const result = service.export(AGENT, 'Venue');

      const start = await nextRequest(`/api/site-agents/${AGENT}/backups/export`);
      start.flush({ message: 'offline' }, { status: 409, statusText: 'Conflict' });

      await expect(result).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('import', () => {
    const PLAN = {
      sourceAgentId: 'agent-old',
      entries: [
        {
          screenId: 'gone',
          backupName: 'Foyer',
          status: 'not_found',
          screenName: null,
          ownerAgentName: null,
        },
      ],
      targets: [{ screenId: 'new', name: 'Foyer (new)', selectable: true, ownerAgentName: null }],
    };

    /** Walks phase one up to the request for the file, answering with the agent's key. */
    async function upToStaging(agentKeyPublic: string): Promise<TestRequest> {
      const begin = await nextRequest(`/api/site-agents/${AGENT}/backups/import-sessions`);
      begin.flush({ sessionId: 'sess-1' });
      await Promise.resolve();
      sse.siteAgentBackupImportKey$.next(
        event('site_agent.backup-import-key', {
          sessionId: 'sess-1',
          publicKey: agentKeyPublic,
          error: null,
        }),
      );
      return nextRequest(`/api/site-agents/${AGENT}/backups/import`);
    }

    it('opens the file on the agent with the password sealed for it, and returns the plan', async () => {
      const agentKey = await generateSealedBoxKeyPair();
      const result = service.openImport(AGENT, backupFile(), 'pass-word');

      const stage = await upToStaging(agentKey.publicKey);
      expect(stage.request.body.sessionId).toBe('sess-1');
      expect(await open(agentKey, stage.request.body.sealedPassword)).toBe('pass-word');
      expect(JSON.stringify(stage.request.body)).not.toContain('pass-word');
      stage.flush({ commandId: 'cmd-2' });
      await Promise.resolve();
      sse.siteAgentBackupImportAnalysed$.next(
        event('site_agent.backup-import-analysed', { sessionId: 'sess-1' }),
      );
      (await nextRequest(`/api/site-agents/${AGENT}/backups/imports/sess-1/plan`)).flush(PLAN);

      await expect(result).resolves.toEqual({ sessionId: 'sess-1', plan: PLAN });
    });

    it('reports an error the agent hit while opening, such as a wrong password', async () => {
      const agentKey = await generateSealedBoxKeyPair();
      const result = service.openImport(AGENT, backupFile(), 'wrong');

      (await upToStaging(agentKey.publicKey)).flush({ commandId: 'c' });
      await Promise.resolve();
      sse.siteAgentBackupImport$.next(
        event('site_agent.backup-import', {
          sessionId: 'sess-1',
          summary: null,
          error: 'Wrong password, or the file is damaged',
        }),
      );

      await expect(result).rejects.toBeInstanceOf(BackupAgentError);
    });

    it('refuses a file that is not a backup before contacting anyone', async () => {
      await expect(service.openImport(AGENT, new Blob(['nope']), 'x')).rejects.toMatchObject({
        problem: 'not_a_backup',
      });
    });

    it('reports when the agent could not open a session', async () => {
      const result = service.openImport(AGENT, backupFile(), 'x');

      const begin = await nextRequest(`/api/site-agents/${AGENT}/backups/import-sessions`);
      begin.flush({ sessionId: 'sess-1' });
      await Promise.resolve();
      sse.siteAgentBackupImportKey$.next(
        event('site_agent.backup-import-key', {
          sessionId: 'sess-1',
          publicKey: null,
          error: 'The agent sent no key',
        }),
      );

      await expect(result).rejects.toThrow('The agent sent no key');
    });

    it('applies the mapping and returns what was restored', async () => {
      const summary = {
        ssapRestored: 1,
        devmodeKeysRestored: 1,
        staleSsapScreenIds: [],
        restored: [
          { screenId: 'new', sourceScreenId: 'gone', created: false, mapped: true, fields: [] },
        ],
        skipped: [],
      };
      const result = service.applyImport(AGENT, 'sess-1', [{ from: 'gone', to: 'new' }]);

      const apply = await nextRequest(`/api/site-agents/${AGENT}/backups/imports/sess-1/apply`);
      expect(apply.request.body).toEqual({ mappings: [{ from: 'gone', to: 'new' }] });
      apply.flush({ commandId: 'c3' });
      await Promise.resolve();
      sse.siteAgentBackupImport$.next(
        event('site_agent.backup-import', { sessionId: 'sess-1', summary, error: null }),
      );

      await expect(result).resolves.toEqual(summary);
    });

    it('cancels an opened import, and does not mind if that fails', async () => {
      const result = service.cancelImport(AGENT, 'sess-1');

      const cancel = await nextRequest(`/api/site-agents/${AGENT}/backups/imports/sess-1`);
      expect(cancel.request.method).toBe('DELETE');
      cancel.flush(null, { status: 500, statusText: 'Server Error' });

      await expect(result).resolves.toBeUndefined();
    });

    it('reads the preview of a file', async () => {
      await expect(service.preview(backupFile())).resolves.toMatchObject({ screenCount: 1 });
    });
  });

  describe('operation$', () => {
    const OPERATION = {
      kind: 'import',
      id: 'sess-1',
      step: 'decrypting',
      startedBy: { userId: 'u', name: 'Flo' },
      startedAt: '2026-10-26T18:00:00.000Z',
    };

    it("starts from the current state and follows this agent's announcements only", async () => {
      const seen: unknown[] = [];
      const sub = service.operation$(AGENT).subscribe((op) => seen.push(op));

      (await nextRequest(`/api/site-agents/${AGENT}/backups/status`)).flush(OPERATION);
      sse.siteAgentBackupProgress$.next(
        event('site_agent.backup-progress', { agentId: 'other', operation: OPERATION }),
      );
      sse.siteAgentBackupProgress$.next(
        event('site_agent.backup-progress', { agentId: AGENT, operation: null }),
      );

      expect(seen).toEqual([OPERATION, null]);
      sub.unsubscribe();
    });

    it('treats an unreadable status as nothing running', async () => {
      const seen: unknown[] = [];
      const sub = service.operation$(AGENT).subscribe((op) => seen.push(op));

      (await nextRequest(`/api/site-agents/${AGENT}/backups/status`)).flush(null, {
        status: 403,
        statusText: 'Forbidden',
      });

      expect(seen).toEqual([null]);
      sub.unsubscribe();
    });
  });

  it('hands the file to the browser download', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const createUrl = vi.fn(() => 'blob:x');
    const revokeUrl = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl }),
    );

    service.download({ password: 'p', file: new Blob(['x']), fileName: 'a.mnsbackup' });

    expect(click).toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledWith('blob:x');
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  describe('backupFileName', () => {
    it('falls back to a generic name when nothing usable is left', () => {
      expect(backupFileName('!!!', new Date('2026-10-26T00:00:00Z'))).toBe(
        'site-agent-2026-10-26.mnsbackup',
      );
    });
  });
});
