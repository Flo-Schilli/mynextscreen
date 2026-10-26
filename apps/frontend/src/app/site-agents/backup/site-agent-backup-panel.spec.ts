import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { TimeoutError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';
import { LANG_STORAGE_KEY } from '../../i18n/i18n.constants';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { SiteAgentBackupPanel } from './site-agent-backup-panel';
import { BackupAgentError, SiteAgentBackupService } from './site-agent-backup.service';
import { BackupFileError, type BackupPreview } from './backup-file';

// The preview renders a date, and the app formats dates for de-DE.
registerLocaleData(localeDe, 'de-DE');

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const PREVIEW: BackupPreview = {
  organisationId: 'org-1',
  sourceAgentId: 'agent-old',
  createdAt: '2026-10-26T12:00:00.000Z',
  agentVersion: '0.30.0',
  screenCount: 2,
};

describe('SiteAgentBackupPanel', () => {
  let fixture: ComponentFixture<SiteAgentBackupPanel>;
  let backups: {
    export: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
    preview: ReturnType<typeof vi.fn>;
    import: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // The preview's date pipe starts the LanguageService, which would otherwise
    // follow jsdom's navigator.language (en-US) mid-test.
    localStorage.setItem(LANG_STORAGE_KEY, 'de');
    backups = {
      export: vi.fn(),
      download: vi.fn(),
      preview: vi.fn().mockResolvedValue(PREVIEW),
      import: vi.fn(),
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

  function click(testId: string): void {
    const host = query(testId);
    (host?.querySelector('button') ?? host)?.click();
  }

  async function pickFile(): Promise<void> {
    click('backup-import');
    await fixture.whenStable();
    const input = query('backup-file') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.mnsbackup')] });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(backups.preview).toHaveBeenCalled());
    await fixture.whenStable();
  }

  function typePassword(value: string): void {
    const input = query('backup-password-input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('disables both actions while the agent is offline', async () => {
    fixture.componentRef.setInput('online', false);
    await fixture.whenStable();

    expect(query('backup-export')?.querySelector('button')?.disabled).toBe(true);
    expect(query('backup-import')?.querySelector('button')?.disabled).toBe(true);
  });

  it('shows the password once the export is done and starts the download', async () => {
    const backup = { password: 'K7QM-2XRA', file: new Blob(['x']), fileName: 'a.mnsbackup' };
    backups.export.mockResolvedValue(backup);

    click('backup-export');
    await vi.waitFor(() => expect(backups.download).toHaveBeenCalledWith(backup));
    await fixture.whenStable();

    expect(query('backup-password')?.textContent?.trim()).toBe('K7QM-2XRA');
    expect(backups.export).toHaveBeenCalledWith('agent-1', 'Venue North');
  });

  it.each([
    [new BackupAgentError('no configuration yet'), 'no configuration yet'],
    [new TimeoutError(), 'nicht rechtzeitig'],
    [new HttpErrorResponse({ status: 409 }), 'nicht verbunden'],
    [new Error('boom'), 'konnte nicht erstellt werden'],
  ])('explains a failed export (%s)', async (error, text) => {
    backups.export.mockRejectedValue(error);

    click('backup-export');
    await vi.waitFor(() => expect(query('backup-export-error')).not.toBeNull());

    expect(query('backup-export-error')?.textContent).toContain(text);
  });

  it('previews a picked file and imports it with the typed password', async () => {
    backups.import.mockResolvedValue({
      ssapRestored: 2,
      devmodeKeysRestored: 1,
      staleSsapScreenIds: ['s2'],
      restored: [
        { screenId: 's1', created: true, filled: [] },
        { screenId: 's2', created: false, filled: [] },
      ],
      skipped: [{ screenId: 's3', reason: 'assigned_to_other_agent' }],
    });
    await pickFile();

    expect(query('backup-preview')?.textContent).toContain('agent-old');
    typePassword('pass-word');
    await fixture.whenStable();
    click('backup-import-confirm');
    await vi.waitFor(() => expect(query('backup-import-done')).not.toBeNull());

    expect(backups.import).toHaveBeenCalledWith('agent-1', expect.any(File), 'pass-word');
    expect(query('backup-import-done')?.textContent).toContain('2 Display(s)');
    expect(fixture.nativeElement.textContent).toContain('gehört einem anderen Agent');
  });

  it('refuses a file from another organisation before asking for a password', async () => {
    backups.preview.mockResolvedValue({ ...PREVIEW, organisationId: 'org-2' });

    await pickFile();

    expect(query('backup-import-error')?.textContent).toContain('anderen Organisation');
    expect(query('backup-password-input')).toBeNull();
  });

  it('explains a file that is not a backup', async () => {
    backups.preview.mockRejectedValue(new BackupFileError('not_a_backup'));

    await pickFile();

    expect(query('backup-import-error')?.textContent).toContain('keine myNextScreen');
  });

  it('keeps the file after a wrong password so it can be retried', async () => {
    backups.import.mockRejectedValue(
      new BackupAgentError('Wrong password, or the file is damaged'),
    );
    await pickFile();
    typePassword('wrong');
    await fixture.whenStable();

    click('backup-import-confirm');
    await vi.waitFor(() => expect(query('backup-import-error')).not.toBeNull());

    expect(query('backup-import-error')?.textContent).toContain('Wrong password');
    expect(query('backup-preview')).not.toBeNull();
    typePassword('right');
    await fixture.whenStable();
    expect(query('backup-import-confirm')?.querySelector('button')?.disabled).toBe(false);
  });
});
