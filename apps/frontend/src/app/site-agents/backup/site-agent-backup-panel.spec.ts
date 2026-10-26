import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { BehaviorSubject, TimeoutError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';
import { LANG_STORAGE_KEY } from '../../i18n/i18n.constants';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { SiteAgentBackupPanel } from './site-agent-backup-panel';
import {
  BackupAgentError,
  SiteAgentBackupService,
  type BackupOperation,
} from './site-agent-backup.service';

// The import dialog renders a date, and the app formats dates for de-DE.
registerLocaleData(localeDe, 'de-DE');

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('SiteAgentBackupPanel', () => {
  let fixture: ComponentFixture<SiteAgentBackupPanel>;
  let operation: BehaviorSubject<BackupOperation | null>;
  let backups: {
    export: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
    operation$: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'de');
    operation = new BehaviorSubject<BackupOperation | null>(null);
    backups = {
      export: vi.fn(),
      download: vi.fn(),
      operation$: vi.fn(() => operation),
    };
    await TestBed.configureTestingModule({
      imports: [SiteAgentBackupPanel, getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: SiteAgentBackupService, useValue: backups },
        { provide: OrganisationStateService, useValue: { selectedOrgId: signal('org-1') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteAgentBackupPanel);
    fixture.componentRef.setInput('agentId', 'agent-1');
    fixture.componentRef.setInput('agentName', 'Venue North');
    fixture.componentRef.setInput('online', true);
    await fixture.whenStable();
  });

  function query(testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  }

  function button(testId: string): HTMLButtonElement | null {
    return query(testId)?.querySelector('button') ?? null;
  }

  it('follows the operations of its own agent', () => {
    expect(backups.operation$).toHaveBeenCalledWith('agent-1');
  });

  it('disables both actions while the agent is offline', async () => {
    fixture.componentRef.setInput('online', false);
    await fixture.whenStable();

    expect(button('backup-export')?.disabled).toBe(true);
    expect(button('backup-import')?.disabled).toBe(true);
  });

  it('shows a running backup with its step and who started it, and disables both actions', async () => {
    operation.next({
      kind: 'import',
      id: 'sess-1',
      step: 'waiting_for_mapping',
      startedBy: { userId: 'u', name: 'Flo' },
      startedAt: '2026-10-26T18:00:00.000Z',
    });
    await fixture.whenStable();

    const progress = query('backup-progress');
    expect(progress?.textContent).toContain('Import läuft');
    expect(progress?.textContent).toContain('warte auf die Zuordnung');
    expect(progress?.textContent).toContain('gestartet von Flo');
    expect(progress?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe(
      '67',
    );
    expect(button('backup-export')?.disabled).toBe(true);
    expect(button('backup-import')?.disabled).toBe(true);
  });

  it('enables the actions again once the operation has ended', async () => {
    operation.next({
      kind: 'export',
      id: 'cmd-1',
      step: 'exporting',
      startedBy: { userId: 'u', name: 'Flo' },
      startedAt: '2026-10-26T18:00:00.000Z',
    });
    await fixture.whenStable();
    expect(query('backup-progress')?.textContent).toContain('Export läuft');

    operation.next(null);
    await fixture.whenStable();

    expect(query('backup-progress')).toBeNull();
    expect(button('backup-export')?.disabled).toBe(false);
  });

  it('shows the password once the export is done and starts the download', async () => {
    const backup = { password: 'K7QM-2XRA', file: new Blob(['x']), fileName: 'a.mnsbackup' };
    backups.export.mockResolvedValue(backup);

    button('backup-export')?.click();
    await vi.waitFor(() => expect(backups.download).toHaveBeenCalledWith(backup));
    await fixture.whenStable();

    expect(query('backup-password')?.textContent?.trim()).toBe('K7QM-2XRA');
    expect(backups.export).toHaveBeenCalledWith('agent-1', 'Venue North');
  });

  it.each([
    [new BackupAgentError('no configuration yet'), 'no configuration yet'],
    [new TimeoutError(), 'nicht rechtzeitig'],
    [new HttpErrorResponse({ status: 409 }), 'schon ein Backup'],
    [new Error('boom'), 'konnte nicht erstellt werden'],
  ])('explains a failed export (%s)', async (error, text) => {
    backups.export.mockRejectedValue(error);

    button('backup-export')?.click();
    await vi.waitFor(() => expect(query('backup-export-error')).not.toBeNull());

    expect(query('backup-export-error')?.textContent).toContain(text);
  });

  it('opens the import dialog and keeps the actions disabled while it is open', async () => {
    button('backup-import')?.click();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('app-site-agent-backup-import-dialog'),
    ).not.toBeNull();
    expect(button('backup-export')?.disabled).toBe(true);
  });
});
