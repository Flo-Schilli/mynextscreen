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
  };

  beforeEach(() => {
    sse = {
      siteAgentBackupExport$: new Subject(),
      siteAgentBackupImportKey$: new Subject(),
      siteAgentBackupImport$: new Subject(),
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
    it('seals the password for the agent key and returns the summary', async () => {
      const agentKey = await generateSealedBoxKeyPair();
      const summary = {
        ssapRestored: 1,
        devmodeKeysRestored: 1,
        staleSsapScreenIds: [],
        restored: [{ screenId: 's1', created: true, filled: ['localIp'] }],
        skipped: [],
      };
      const result = service.import(AGENT, backupFile(), 'pass-word');

      const begin = await nextRequest(`/api/site-agents/${AGENT}/backups/import-sessions`);
      begin.flush({ sessionId: 'sess-1' });
      await Promise.resolve();
      sse.siteAgentBackupImportKey$.next(
        event('site_agent.backup-import-key', {
          sessionId: 'sess-1',
          publicKey: agentKey.publicKey,
          error: null,
        }),
      );

      const stage = await nextRequest(`/api/site-agents/${AGENT}/backups/import`);
      expect(stage.request.body.sessionId).toBe('sess-1');
      expect(await open(agentKey, stage.request.body.sealedPassword)).toBe('pass-word');
      expect(JSON.stringify(stage.request.body)).not.toContain('pass-word');
      stage.flush({ commandId: 'cmd-2' });
      await Promise.resolve();
      sse.siteAgentBackupImport$.next(
        event('site_agent.backup-import', { sessionId: 'sess-1', summary, error: null }),
      );

      await expect(result).resolves.toEqual(summary);
    });

    it('refuses a file that is not a backup before contacting anyone', async () => {
      await expect(service.import(AGENT, new Blob(['nope']), 'x')).rejects.toMatchObject({
        problem: 'not_a_backup',
      });
    });

    it('reports when the agent could not open a session', async () => {
      const result = service.import(AGENT, backupFile(), 'x');

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

    it('reports the agent error, such as a wrong password', async () => {
      const agentKey = await generateSealedBoxKeyPair();
      const result = service.import(AGENT, backupFile(), 'wrong');

      (await nextRequest(`/api/site-agents/${AGENT}/backups/import-sessions`)).flush({
        sessionId: 'sess-1',
      });
      await Promise.resolve();
      sse.siteAgentBackupImportKey$.next(
        event('site_agent.backup-import-key', {
          sessionId: 'sess-1',
          publicKey: agentKey.publicKey,
        }),
      );
      (await nextRequest(`/api/site-agents/${AGENT}/backups/import`)).flush({ commandId: 'c' });
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

    it('reads the preview of a file', async () => {
      await expect(service.preview(backupFile())).resolves.toMatchObject({ screenCount: 1 });
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
