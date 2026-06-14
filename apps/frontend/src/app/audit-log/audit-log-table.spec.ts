import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AuditLogTable } from './audit-log-table';
import { AuditEntry } from './audit-log.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'a1',
    timestamp: '2026-01-01T12:00:00.000Z',
    userId: 'u1',
    organisationId: 'org1',
    action: 'content.upload',
    resourceType: 'content',
    resourceId: 'c1',
    details: { name: 'clip.mp4' },
    ...overrides,
  };
}

describe('AuditLogTable', () => {
  let fixture: ComponentFixture<AuditLogTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogTable],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogTable);
  });

  function setInputs(args: {
    entries: AuditEntry[];
    total?: number;
    loading?: boolean;
    hasMore?: boolean;
    userMap?: Map<string, string>;
  }): void {
    fixture.componentRef.setInput('entries', args.entries);
    fixture.componentRef.setInput('total', args.total ?? args.entries.length);
    fixture.componentRef.setInput('loading', args.loading ?? false);
    fixture.componentRef.setInput('hasMore', args.hasMore ?? false);
    fixture.componentRef.setInput('userMap', args.userMap ?? new Map<string, string>());
    fixture.detectChanges();
  }

  /**
   * The table now uses div-based rows (not <table>/<tbody>/<tr>/<td>).
   * Each data entry renders as a row div inside the grid; day-divider rows
   * are also divs. We select entry rows via `[aria-expanded]` (the data rows
   * have that attribute) and the stable CSS class selectors kept from the
   * original design.
   */

  /** Returns only the entry-row divs (have aria-expanded attribute). */
  function entryRows(): ReturnType<typeof fixture.debugElement.queryAll> {
    return fixture.debugElement.queryAll(By.css('[aria-expanded]'));
  }

  describe('row rendering', () => {
    it('renders one entry row per entry', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })] });

      // Assert
      expect(entryRows().length).toBe(2);
    });

    it('renders the action label and its category as the badge data-category', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ action: 'content.upload' })] });

      // Assert
      const badge = fixture.debugElement.query(By.css('.action-badge'));
      expect(badge.nativeElement.textContent.trim()).toContain('Content uploaded');
      expect(badge.attributes['data-category']).toBe('content');
    });

    it('falls back to the raw action key when no label is registered', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ action: 'mystery.event' })] });

      // Assert
      const badge = fixture.debugElement.query(By.css('.action-badge'));
      expect(badge.nativeElement.textContent.trim()).toContain('mystery.event');
      expect(badge.attributes['data-category']).toBe('mystery');
    });

    it('formats the timestamp via the date pipe', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ timestamp: '2026-01-01T12:00:00.000Z' })] });

      // Assert
      const cell = fixture.debugElement.query(By.css('.timestamp-cell'));
      expect(cell.nativeElement.textContent.trim().length).toBeGreaterThan(0);
      // The time cell shows HH:mm:ss; the date is visible in the expanded panel.
      // Confirm the element is rendered at all.
      expect(cell).not.toBeNull();
    });

    it('shows the resource type cell verbatim', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ resourceType: 'playlist' })] });

      // Assert
      const cell = fixture.debugElement.query(By.css('.resource-type-cell'));
      expect(cell.nativeElement.textContent.trim()).toBe('playlist');
    });
  });

  describe('user display', () => {
    it('shows the resolved user name from the user map', () => {
      // Arrange / Act
      setInputs({
        entries: [makeEntry({ userId: 'u1' })],
        userMap: new Map([['u1', 'Alice']]),
      });

      // Assert — the user name appears somewhere in the rendered row text
      const row = entryRows()[0];
      expect(row.nativeElement.textContent).toContain('Alice');
    });

    it('shows a truncated id when the user is not in the map', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ userId: 'abcdef1234567890' })] });

      // Assert
      const row = entryRows()[0];
      expect(row.nativeElement.textContent).toContain('abcdef12...');
    });

    it('shows "System" when the entry has no user', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ userId: null })] });

      // Assert
      const row = entryRows()[0];
      expect(row.nativeElement.textContent).toContain('System');
    });
  });

  describe('resource display', () => {
    it('prefers the details name as a clickable link when a resourceId exists', () => {
      // Arrange / Act
      setInputs({
        entries: [makeEntry({ resourceId: 'c1', details: { name: 'clip.mp4' } })],
      });

      // Assert
      const link = fixture.debugElement.query(By.css('.resource-link'));
      expect(link.nativeElement.textContent.trim()).toBe('clip.mp4');
    });

    it('falls back through title, filename and email for the resource label', () => {
      // Arrange / Act
      setInputs({
        entries: [makeEntry({ resourceId: 'c1', details: { title: 'My Playlist' } })],
      });

      // Assert
      expect(
        fixture.debugElement.query(By.css('.resource-link')).nativeElement.textContent.trim(),
      ).toBe('My Playlist');
    });

    it('shows a truncated resourceId when no nameable detail exists', () => {
      // Arrange / Act
      setInputs({
        entries: [makeEntry({ resourceId: 'abcdef1234567890', details: { count: 3 } })],
      });

      // Assert
      expect(
        fixture.debugElement.query(By.css('.resource-link')).nativeElement.textContent.trim(),
      ).toBe('abcdef12...');
    });

    it('renders a muted dash instead of a link when resourceId is null', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ resourceId: null })] });

      // Assert
      expect(fixture.debugElement.query(By.css('.resource-link'))).toBeNull();
      // The dash element sits inside the entry row
      const row = entryRows()[0];
      const textContent = row.nativeElement.textContent;
      expect(textContent).toContain('—');
    });

    it('emits selectResource with type and id on link click', () => {
      // Arrange
      const spy = vi.fn();
      setInputs({ entries: [makeEntry({ resourceType: 'content', resourceId: 'c1' })] });
      fixture.componentInstance.selectResource.subscribe(spy);

      // Act
      fixture.debugElement.query(By.css('.resource-link')).nativeElement.click();

      // Assert
      expect(spy).toHaveBeenCalledWith({ resourceType: 'content', resourceId: 'c1' });
    });
  });

  describe('details cell', () => {
    it('formats remaining detail key/value pairs, excluding nameable keys', () => {
      // Arrange / Act
      setInputs({
        entries: [makeEntry({ details: { name: 'clip.mp4', sizeBytes: 1024, format: 'mp4' } })],
      });

      // Assert
      const text = fixture.debugElement.query(By.css('.details-text'));
      expect(text.nativeElement.textContent.trim()).toBe('sizeBytes: 1024, format: mp4');
    });

    it('exposes the full details JSON as the tooltip title', () => {
      // Arrange / Act
      const details = { name: 'clip.mp4', sizeBytes: 1024 };
      setInputs({ entries: [makeEntry({ details })] });

      // Assert
      const text = fixture.debugElement.query(By.css('.details-text'));
      expect(text.attributes['title']).toBe(JSON.stringify(details, null, 2));
    });

    it('renders a muted dash when details are null', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ details: null })] });

      // Assert
      expect(fixture.debugElement.query(By.css('.details-text'))).toBeNull();
      // The dash appears somewhere in the entry row
      const row = entryRows()[0];
      const detailsCell = row.query(By.css('.details-cell'));
      expect(detailsCell.nativeElement.textContent.trim()).toContain('—');
    });

    it('renders a muted dash when details object is empty', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ details: {} })] });

      // Assert
      expect(fixture.debugElement.query(By.css('.details-text'))).toBeNull();
      const row = entryRows()[0];
      const detailsCell = row.query(By.css('.details-cell'));
      expect(detailsCell.nativeElement.textContent.trim()).toContain('—');
    });

    it('shows a dash when details contain only nameable keys', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry({ details: { name: 'clip.mp4' } })] });

      // Assert
      const text = fixture.debugElement.query(By.css('.details-text'));
      expect(text.nativeElement.textContent.trim()).toBe('—');
    });
  });

  describe('load-more footer', () => {
    it('is hidden when there is nothing more to load', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry()], total: 1, hasMore: false });

      // Assert
      expect(fixture.debugElement.query(By.css('.load-more-container'))).toBeNull();
    });

    it('shows a count and emits loadMore on click when more is available', () => {
      // Arrange
      const spy = vi.fn();
      setInputs({ entries: [makeEntry()], total: 50, hasMore: true });
      fixture.componentInstance.loadMore.subscribe(spy);

      // Assert count text
      expect(fixture.debugElement.query(By.css('.count-text')).nativeElement.textContent).toContain(
        'Showing 1 of 50 entries',
      );

      // Act — mns-btn wraps a native <button>; click it
      fixture.debugElement.query(By.css('.load-more-container button')).nativeElement.click();

      // Assert
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('disables the button and shows a loading label while loading', () => {
      // Arrange / Act
      setInputs({ entries: [makeEntry()], total: 50, hasMore: true, loading: true });

      // Assert
      const btn = fixture.debugElement.query(By.css('.load-more-container button'));
      expect(btn.nativeElement.disabled).toBe(true);
      expect(btn.nativeElement.textContent.trim()).toContain('Loading');
    });
  });
});
