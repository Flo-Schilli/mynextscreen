import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentUploadProgress } from './content-upload-progress';
import { UploadItem } from './content.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeFile(name: string): File {
  return new File(['data'], name, { type: 'image/png' });
}

function makeUpload(overrides: Partial<UploadItem> = {}): UploadItem {
  return {
    file: makeFile('a.png'),
    title: 'a',
    progress: 0,
    status: 'uploading',
    ...overrides,
  };
}

describe('ContentUploadProgress', () => {
  let fixture: ComponentFixture<ContentUploadProgress>;

  function setUp(uploads: UploadItem[]): void {
    fixture = TestBed.createComponent(ContentUploadProgress);
    fixture.componentRef.setInput('uploads', uploads);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('hides the upload list when there are no uploads', () => {
    // Arrange / Act
    setUp([]);

    // Assert
    expect(fixture.nativeElement.querySelector('.upload-list')).toBeNull();
  });

  it('shows the progress percentage for an uploading item', () => {
    // Arrange / Act
    setUp([makeUpload({ progress: 42, status: 'uploading' })]);

    // Assert
    const status = fixture.nativeElement.querySelector('.upload-item-status').textContent as string;
    expect(status).toContain('42%');
  });

  it('shows "Done" for a finished upload', () => {
    // Arrange / Act
    setUp([makeUpload({ progress: 100, status: 'done' })]);

    // Assert
    const status = fixture.nativeElement.querySelector('.upload-item-status').textContent as string;
    expect(status).toContain('Done');
  });

  it('shows the error message and error styling for a failed upload', () => {
    // Arrange / Act
    setUp([makeUpload({ status: 'error', error: 'Too big' })]);

    // Assert
    const statusEl: HTMLElement = fixture.nativeElement.querySelector('.upload-item-status');
    expect(statusEl.textContent).toContain('Too big');
    expect(statusEl.classList.contains('error')).toBe(true);
  });

  it('falls back to a generic Error label when a failed upload has no message', () => {
    // Arrange / Act
    setUp([makeUpload({ status: 'error', error: undefined })]);

    // Assert
    const status = fixture.nativeElement.querySelector('.upload-item-status').textContent as string;
    expect(status).toContain('Error');
  });
});
