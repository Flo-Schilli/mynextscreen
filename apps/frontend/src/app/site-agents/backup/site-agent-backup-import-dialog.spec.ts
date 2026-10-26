import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';
import { LANG_STORAGE_KEY } from '../../i18n/i18n.constants';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { SiteAgentBackupImportDialog } from './site-agent-backup-import-dialog';
import {
  BackupAgentError,
  SiteAgentBackupService,
  type OpenedImport,
} from './site-agent-backup.service';
import { BackupFileError, type BackupPreview } from './backup-file';

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
  screenCount: 3,
};

const OPENED: OpenedImport = {
  sessionId: 'sess-1',
  plan: {
    sourceAgentId: 'agent-old',
    entries: [
      {
        screenId: 'bar',
        backupName: 'Bar',
        status: 'fill',
        screenName: 'Bar',
        ownerAgentName: null,
      },
      {
        screenId: 'hall',
        backupName: 'Hall',
        status: 'other_agent',
        screenName: 'Hall',
        ownerAgentName: 'Saal 2',
      },
      {
        screenId: 'gone',
        backupName: 'Foyer links',
        status: 'not_found',
        screenName: null,
        ownerAgentName: null,
      },
    ],
    targets: [
      { screenId: 'new', name: 'Foyer links (neu)', selectable: true, ownerAgentName: null },
      { screenId: 'stage', name: 'Bühne rechts', selectable: false, ownerAgentName: 'Saal 2' },
    ],
  },
};

describe('SiteAgentBackupImportDialog', () => {
  let fixture: ComponentFixture<SiteAgentBackupImportDialog>;
  let closed: ReturnType<typeof vi.fn<() => void>>;
  let backups: {
    preview: ReturnType<typeof vi.fn>;
    openImport: ReturnType<typeof vi.fn>;
    applyImport: ReturnType<typeof vi.fn>;
    cancelImport: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'de');
    backups = {
      preview: vi.fn().mockResolvedValue(PREVIEW),
      openImport: vi.fn().mockResolvedValue(OPENED),
      applyImport: vi.fn(),
      cancelImport: vi.fn().mockResolvedValue(undefined),
    };
    await TestBed.configureTestingModule({
      imports: [SiteAgentBackupImportDialog, getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: SiteAgentBackupService, useValue: backups },
        { provide: OrganisationStateService, useValue: { selectedOrgId: signal('org-1') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteAgentBackupImportDialog);
    fixture.componentRef.setInput('agentId', 'agent-1');
    closed = vi.fn<() => void>();
    fixture.componentInstance.closed.subscribe(() => closed());
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
  });

  // The modal renders into an overlay on <body>, so query the document.
  function query(testId: string): HTMLElement | null {
    return document.querySelector(`[data-testid="${testId}"]`);
  }

  function button(testId: string): HTMLButtonElement | null {
    const host = query(testId);
    return host?.querySelector('button') ?? (host as HTMLButtonElement | null);
  }

  function currentStep(): string {
    return (
      document.querySelector('[aria-current="step"]')?.parentElement?.textContent?.trim() ?? ''
    );
  }

  async function pickFile(): Promise<void> {
    const input = query('backup-file') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.mnsbackup')] });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(backups.preview).toHaveBeenCalled());
    await fixture.whenStable();
  }

  async function typePassword(value: string): Promise<void> {
    const input = query('backup-password-input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function toMapping(): Promise<void> {
    await pickFile();
    button('backup-next')?.click();
    await fixture.whenStable();
    await typePassword('pass-word');
    button('backup-open')?.click();
    await vi.waitFor(() => expect(query('backup-mapping')).not.toBeNull());
  }

  /** Opens the row's select and clicks the option with that label. */
  async function chooseTarget(label: string): Promise<void> {
    const row = query('backup-mapping-row') as HTMLElement;
    (row.querySelector('button[aria-haspopup]') as HTMLButtonElement).click();
    await fixture.whenStable();
    const option = Array.from(document.querySelectorAll<HTMLButtonElement>('[role=option]')).find(
      (candidate) => candidate.textContent?.includes(label),
    );
    option?.click();
    await fixture.whenStable();
  }

  it('starts at the file step and only goes on with a readable file', async () => {
    expect(currentStep()).toContain('Datei');
    expect(button('backup-next')?.disabled).toBe(true);

    await pickFile();

    expect(query('backup-preview')?.textContent).toContain('agent-old');
    expect(button('backup-next')?.disabled).toBe(false);
  });

  it('refuses a file from another organisation', async () => {
    backups.preview.mockResolvedValue({ ...PREVIEW, organisationId: 'org-2' });

    await pickFile();

    expect(query('backup-import-error')?.textContent).toContain('anderen Organisation');
    expect(button('backup-next')?.disabled).toBe(true);
  });

  it('explains a file that is not a backup', async () => {
    backups.preview.mockRejectedValue(new BackupFileError('not_a_backup'));

    await pickFile();

    expect(query('backup-import-error')?.textContent).toContain('keine myNextScreen');
  });

  it('opens the file with the typed password and shows what would happen', async () => {
    await toMapping();

    expect(backups.openImport).toHaveBeenCalledWith('agent-1', expect.any(File), 'pass-word');
    expect(currentStep()).toContain('Zuordnung');
    const mapping = query('backup-mapping')?.textContent ?? '';
    expect(mapping).toContain('Wird wiederhergestellt');
    expect(mapping).toContain('Bar');
    expect(mapping).toContain('Foyer links');
    expect(mapping).toContain('gehört Agent „Saal 2“');
    expect(query('backup-overwrite-warning')).toBeNull();
  });

  it('stays on the password step after a wrong password, ready for another try', async () => {
    backups.openImport.mockRejectedValueOnce(
      new BackupAgentError('Wrong password, or the file is damaged'),
    );
    await pickFile();
    button('backup-next')?.click();
    await fixture.whenStable();
    await typePassword('wrong');

    button('backup-open')?.click();
    await vi.waitFor(() => expect(query('backup-import-error')).not.toBeNull());

    expect(query('backup-import-error')?.textContent).toContain('Wrong password');
    expect(currentStep()).toContain('Passwort');
    expect(button('backup-open')?.disabled).toBe(false);
  });

  it('warns before overwriting, then restores with the mapping and shows the result', async () => {
    backups.applyImport.mockResolvedValue({
      ssapRestored: 2,
      devmodeKeysRestored: 2,
      staleSsapScreenIds: [],
      restored: [
        { screenId: 'bar', sourceScreenId: 'bar', created: false, mapped: false, fields: [] },
        { screenId: 'new', sourceScreenId: 'gone', created: false, mapped: true, fields: [] },
      ],
      skipped: [{ screenId: 'hall', reason: 'assigned_to_other_agent' }],
    });
    await toMapping();

    await chooseTarget('Foyer links (neu)');
    expect(query('backup-overwrite-warning')?.textContent).toContain('„Foyer links (neu)“');

    button('backup-apply')?.click();
    await vi.waitFor(() => expect(query('backup-import-done')).not.toBeNull());

    expect(backups.applyImport).toHaveBeenCalledWith('agent-1', 'sess-1', [
      { from: 'gone', to: 'new' },
    ]);
    const result = document.body.textContent ?? '';
    expect(result).toContain('2 Display(s) wiederhergestellt');
    expect(result).toContain('1 davon einem anderen Display zugeordnet');
    expect(result).toContain('Hall');
    expect(currentStep()).toBe('');
  });

  it('does not let a screen of another agent be picked', async () => {
    await toMapping();

    await chooseTarget('Bühne rechts');

    expect(query('backup-overwrite-warning')).toBeNull();
  });

  it('skips unmapped entries by sending no mapping for them', async () => {
    backups.applyImport.mockResolvedValue({
      ssapRestored: 1,
      devmodeKeysRestored: 1,
      staleSsapScreenIds: [],
      restored: [],
      skipped: [],
    });
    await toMapping();

    button('backup-apply')?.click();
    await vi.waitFor(() => expect(backups.applyImport).toHaveBeenCalled());

    expect(backups.applyImport).toHaveBeenCalledWith('agent-1', 'sess-1', []);
  });

  it('goes back to the password step when applying fails', async () => {
    backups.applyImport.mockRejectedValue(new BackupAgentError('The import session has expired'));
    await toMapping();

    button('backup-apply')?.click();
    await vi.waitFor(() => expect(query('backup-import-error')).not.toBeNull());

    expect(currentStep()).toContain('Passwort');
  });

  it('cancels the opened import when closed at the mapping step', async () => {
    await toMapping();

    (
      Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Abbrechen'),
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(backups.cancelImport).toHaveBeenCalledWith('agent-1', 'sess-1');
    expect(closed).toHaveBeenCalled();
  });

  it('closes without cancelling anything before a file was opened', async () => {
    (
      Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Abbrechen'),
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(backups.cancelImport).not.toHaveBeenCalled();
    expect(closed).toHaveBeenCalled();
  });
});
