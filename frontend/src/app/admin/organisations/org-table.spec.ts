import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { OrgTable } from './org-table';
import { Organisation } from './organisation.model';

function makeOrganisation(overrides: Partial<Organisation> = {}): Organisation {
  return {
    id: 'org-1',
    name: 'Acme Venue',
    timeZone: 'Europe/Vienna',
    storageOriginalLimitBytes: 1024 * 1024,
    storageTranscodedLimitBytes: 2 * 1024 * 1024,
    storageOriginalUsedBytes: 0,
    storageTranscodedUsedBytes: 0,
    defaultPlaylistId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('OrgTable', () => {
  let fixture: ComponentFixture<OrgTable>;
  let component: OrgTable;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgTable],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrgTable);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('organisations', []);
    fixture.componentRef.setInput('memberCounts', {});
  });

  it('renders one row per organisation', () => {
    // Arrange
    fixture.componentRef.setInput('organisations', [
      makeOrganisation({ id: 'org-1', name: 'Acme' }),
      makeOrganisation({ id: 'org-2', name: 'Globex' }),
    ]);

    // Act
    fixture.detectChanges();

    // Assert
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);
    expect(rows[0].nativeElement.textContent).toContain('Acme');
    expect(rows[1].nativeElement.textContent).toContain('Globex');
  });

  it('shows the member count when present for an org', () => {
    // Arrange
    fixture.componentRef.setInput('organisations', [makeOrganisation({ id: 'org-1' })]);
    fixture.componentRef.setInput('memberCounts', { 'org-1': 5 });

    // Act
    fixture.detectChanges();

    // Assert
    const cells = fixture.debugElement.queryAll(By.css('tbody td'));
    expect(cells[2].nativeElement.textContent.trim()).toBe('5');
  });

  it('shows a placeholder when the member count is not yet loaded', () => {
    // Arrange
    fixture.componentRef.setInput('organisations', [makeOrganisation({ id: 'org-1' })]);
    fixture.componentRef.setInput('memberCounts', {});

    // Act
    fixture.detectChanges();

    // Assert
    const cells = fixture.debugElement.queryAll(By.css('tbody td'));
    expect(cells[2].nativeElement.textContent.trim()).toBe('...');
  });

  it('emits selectOrg with the clicked organisation', () => {
    // Arrange
    const org = makeOrganisation({ id: 'org-7' });
    fixture.componentRef.setInput('organisations', [org]);
    const spy = vi.fn();
    component.selectOrg.subscribe(spy);
    fixture.detectChanges();

    // Act
    fixture.debugElement.query(By.css('tbody tr')).triggerEventHandler('click', undefined);

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(org);
  });

  describe('formatBytes', () => {
    it('returns "0 B" for zero', () => {
      const format = (component as unknown as { formatBytes(n: number): string }).formatBytes;
      expect(format(0)).toBe('0 B');
    });

    it('formats bytes without decimals and larger units with one decimal', () => {
      const format = (component as unknown as { formatBytes(n: number): string }).formatBytes;
      expect(format(512)).toBe('512 B');
      expect(format(1024)).toBe('1.0 KB');
      expect(format(1024 * 1024)).toBe('1.0 MB');
      expect(format(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
    });
  });
});
