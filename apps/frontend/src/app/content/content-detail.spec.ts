import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentDetail, MetadataUpdate } from './content-detail';
import { Content } from './content.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'c1',
    organisationId: 'org1',
    title: 'Original Title',
    description: 'Original description',
    tags: ['promo', 'summer'],
    type: 'image',
    originalFilename: 'item.png',
    originalMimeType: 'image/png',
    originalSizeBytes: 1024,
    transcodedSizeBytes: null,
    transcodingStatus: 'completed',
    transcodingError: null,
    durationSeconds: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ContentDetail', () => {
  let fixture: ComponentFixture<ContentDetail>;

  function setUp(content: Content): void {
    fixture = TestBed.createComponent(ContentDetail);
    fixture.componentRef.setInput('content', content);
    fixture.componentRef.setInput('transcodingProgress', {});
    fixture.componentRef.setInput('previewUrl', (c: Content) => `/preview/${c.id}`);
    fixture.componentRef.setInput('savingMetadata', false);
    fixture.componentRef.setInput('metadataError', '');
    fixture.componentRef.setInput('metadataSaved', false);
    fixture.detectChanges();
  }

  function titleInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#editTitle');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('seeds the metadata form from the content input on init', async () => {
    setUp(makeContent());
    await fixture.whenStable(); // let ngModel flush model -> view
    expect(titleInput().value).toBe('Original Title');
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Original Title');
  });

  it('emits a save payload with parsed tags', () => {
    setUp(makeContent());
    let emitted: MetadataUpdate | undefined;
    fixture.componentInstance.save.subscribe((v: MetadataUpdate) => (emitted = v));

    const input = titleInput();
    input.value = 'New Title';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-primary');
    saveBtn.click();

    expect(emitted).toEqual({
      title: 'New Title',
      description: 'Original description',
      tags: ['promo', 'summer'],
    });
  });

  it('does NOT reset unsaved edits when the content input is replaced in place', () => {
    // Simulates the parent swapping selectedContent on a transcoding SSE event
    // while the user has unsaved changes. The form must keep the user's text.
    setUp(makeContent());

    const input = titleInput();
    input.value = 'User Was Typing';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Parent replaces the content reference (e.g. transcoding completed).
    fixture.componentRef.setInput(
      'content',
      makeContent({ transcodingStatus: 'completed', transcodedSizeBytes: 512 }),
    );
    fixture.detectChanges();

    expect(titleInput().value).toBe('User Was Typing');
  });

  it('emits dismiss when Close is clicked', () => {
    setUp(makeContent());
    let dismissed = false;
    fixture.componentInstance.dismiss.subscribe(() => (dismissed = true));

    const closeBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Close',
    ) as HTMLButtonElement;
    closeBtn.click();

    expect(dismissed).toBe(true);
  });
});
