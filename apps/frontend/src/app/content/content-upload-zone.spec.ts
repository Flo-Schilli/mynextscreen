import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentUploadZone } from './content-upload-zone';
import { UploadItem } from './content.model';

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

/** Builds a DragEvent carrying the given files on its dataTransfer. */
function makeDropEvent(files: File[]): DragEvent {
  const event = new Event('drop') as DragEvent;
  const list = {
    ...files,
    length: files.length,
    item: (i: number) => files[i],
  } as unknown as FileList;
  Object.defineProperty(event, 'dataTransfer', {
    value: { files: list } as DataTransfer,
  });
  return event;
}

describe('ContentUploadZone', () => {
  let fixture: ComponentFixture<ContentUploadZone>;

  function setUp(uploads: UploadItem[]): void {
    fixture = TestBed.createComponent(ContentUploadZone);
    fixture.componentRef.setInput('uploads', uploads);
    fixture.detectChanges();
  }

  function zone(): HTMLElement {
    return fixture.nativeElement.querySelector('.upload-zone');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('adds the drag-over class on dragover and removes it on dragleave', () => {
    // Arrange
    setUp([]);

    // Act: dragover
    zone().dispatchEvent(new Event('dragover'));
    fixture.detectChanges();
    // Assert
    expect(zone().classList.contains('drag-over')).toBe(true);

    // Act: dragleave
    zone().dispatchEvent(new Event('dragleave'));
    fixture.detectChanges();
    // Assert
    expect(zone().classList.contains('drag-over')).toBe(false);
  });

  it('emits the dropped files and clears the drag-over state on drop', () => {
    // Arrange
    setUp([]);
    const emitted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((f) => emitted.push(f));
    fixture.componentInstance.onDragOver(new Event('dragover') as DragEvent);

    // Act
    const files = [makeFile('one.png'), makeFile('two.png')];
    fixture.componentInstance.onDrop(makeDropEvent(files));
    fixture.detectChanges();

    // Assert
    expect(emitted.length).toBe(1);
    expect(emitted[0].map((f) => f.name)).toEqual(['one.png', 'two.png']);
    expect(zone().classList.contains('drag-over')).toBe(false);
  });

  it('does not emit when a drop carries no dataTransfer files', () => {
    // Arrange
    setUp([]);
    const spy = vi.fn();
    fixture.componentInstance.filesSelected.subscribe(spy);

    // Act: drop event without a dataTransfer
    fixture.componentInstance.onDrop(new Event('drop') as DragEvent);

    // Assert
    expect(spy).not.toHaveBeenCalled();
  });

  it('emits selected files from the file input and resets the input value', () => {
    // Arrange
    setUp([]);
    const emitted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((f) => emitted.push(f));
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    const file = makeFile('pick.png');
    Object.defineProperty(input, 'files', {
      value: {
        length: 1,
        item: () => file,
        0: file,
      } as unknown as FileList,
      configurable: true,
    });

    // Act
    input.dispatchEvent(new Event('change'));

    // Assert
    expect(emitted.length).toBe(1);
    expect(emitted[0][0].name).toBe('pick.png');
    expect(input.value).toBe('');
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
