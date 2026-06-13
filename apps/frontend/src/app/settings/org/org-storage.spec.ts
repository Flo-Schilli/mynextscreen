import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { OrgStorage } from './org-storage';
import { ContentService } from '../../content/content.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { StorageUsageBars } from '../../shared/storage-usage-bars';
import { StorageInfo } from '../../content/content.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const storage: StorageInfo = {
  originalUsedBytes: 100,
  originalLimitBytes: 1000,
  transcodedUsedBytes: 200,
  transcodedLimitBytes: 2000,
};

describe('OrgStorage', () => {
  let fixture: ComponentFixture<OrgStorage>;
  const getStorage = vi.fn();
  const selectedOrgId = signal<string | null>('org-1');

  beforeEach(() => getStorage.mockReset());

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [OrgStorage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ContentService, useValue: { getStorage } },
        { provide: OrganisationStateService, useValue: { selectedOrgId } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrgStorage);
    fixture.detectChanges();
  }

  it('loads and renders the storage bars for the active org', async () => {
    selectedOrgId.set('org-1');
    getStorage.mockReturnValue(of(storage));
    await setup();

    expect(getStorage).toHaveBeenCalledWith('org-1');
    expect(fixture.debugElement.query(By.directive(StorageUsageBars))).not.toBeNull();
    expect(fixture.componentInstance.storage()).toEqual(storage);
  });

  it('shows an error when no organisation is selected', async () => {
    selectedOrgId.set(null);
    await setup();

    expect(getStorage).not.toHaveBeenCalled();
    expect(fixture.componentInstance.loadError()).toContain('No organisation selected');
  });

  it('surfaces load failures', async () => {
    selectedOrgId.set('org-1');
    getStorage.mockReturnValue(throwError(() => ({ status: 500 })));
    await setup();

    expect(fixture.componentInstance.loadError()).toContain('Failed to load');
  });
});
