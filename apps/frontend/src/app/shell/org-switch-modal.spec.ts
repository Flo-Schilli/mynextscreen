import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { OrgSwitchModal } from './org-switch-modal';
import { OrgWithRole } from './organisation-state.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORGS: OrgWithRole[] = [
  { id: 'org-1', name: 'Venue One', timeZone: 'Europe/Vienna', role: 'org_admin' },
  { id: 'org-2', name: 'Venue Two', timeZone: 'Europe/Berlin', role: 'editor' },
  { id: 'org-3', name: 'Venue Three', timeZone: 'Europe/Zurich', role: 'viewer' },
];

async function createFixture(
  overrides: { organisations?: OrgWithRole[]; selectedOrgId?: string | null } = {},
): Promise<ComponentFixture<OrgSwitchModal>> {
  await TestBed.configureTestingModule({
    imports: [OrgSwitchModal],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(OrgSwitchModal);
  fixture.componentRef.setInput('organisations', overrides.organisations ?? ORGS);
  fixture.componentRef.setInput(
    'selectedOrgId',
    overrides.selectedOrgId === undefined ? 'org-1' : overrides.selectedOrgId,
  );
  fixture.detectChanges();
  return fixture;
}

describe('OrgSwitchModal', () => {
  it('renders one option per organisation with name and role', async () => {
    // Arrange + Act
    const fixture = await createFixture();

    // Assert
    const options = fixture.debugElement.queryAll(By.css('.org-option'));
    expect(options.length).toBe(3);
    const names = fixture.debugElement
      .queryAll(By.css('.org-option-name'))
      .map((el) => (el.nativeElement as HTMLElement).textContent?.trim());
    const roles = fixture.debugElement
      .queryAll(By.css('.org-option-role'))
      .map((el) => (el.nativeElement as HTMLElement).textContent?.trim());
    expect(names).toEqual(['Venue One', 'Venue Two', 'Venue Three']);
    expect(roles).toEqual(['Admin', 'Editor', 'Viewer']);
  });

  it('marks the selected organisation and shows the check icon on it only', async () => {
    // Arrange + Act
    const fixture = await createFixture({ selectedOrgId: 'org-2' });

    // Assert
    const options = fixture.debugElement.queryAll(By.css('.org-option'));
    const selected = options.filter((el) =>
      (el.nativeElement as HTMLElement).classList.contains('selected'),
    );
    expect(selected.length).toBe(1);
    expect((selected[0].nativeElement as HTMLElement).getAttribute('aria-current')).toBe('true');
    expect(
      (
        selected[0].query(By.css('.org-option-name')).nativeElement as HTMLElement
      ).textContent?.trim(),
    ).toBe('Venue Two');
    expect(fixture.debugElement.queryAll(By.css('.org-option-check')).length).toBe(1);
  });

  it('emits selectOrg with the chosen org id when an option is clicked', async () => {
    // Arrange
    const fixture = await createFixture();
    const spy = vi.fn();
    fixture.componentInstance.selectOrg.subscribe(spy);

    // Act
    const thirdOption = fixture.debugElement.queryAll(By.css('.org-option'))[2];
    (thirdOption.nativeElement as HTMLButtonElement).click();

    // Assert
    expect(spy).toHaveBeenCalledExactlyOnceWith('org-3');
  });

  it('emits dismiss when the Close button is clicked', async () => {
    // Arrange
    const fixture = await createFixture();
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    // Act
    (
      fixture.debugElement.query(By.css('.btn-secondary')).nativeElement as HTMLButtonElement
    ).click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the mns-overlay backdrop is clicked', async () => {
    // Arrange
    const fixture = await createFixture();
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    // Act — click the inner overlay div (fixed inset-0); mns-overlay emits closed on backdrop click
    const overlayDiv = fixture.debugElement.query(By.css('mns-overlay > div'));
    (overlayDiv.nativeElement as HTMLElement).click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not emit dismiss when the modal panel is clicked', async () => {
    // Arrange
    const fixture = await createFixture();
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    // Act — click inside the mns-modal panel (stopPropagation prevents bubble to overlay)
    const modalPanel = fixture.debugElement.query(By.css('mns-modal > div'));
    (modalPanel.nativeElement as HTMLElement).click();

    // Assert
    expect(spy).not.toHaveBeenCalled();
  });
});
