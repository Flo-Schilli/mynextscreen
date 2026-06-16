import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, HttpEventType } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ContentLibrary } from './content-library';
import { Content, StorageInfo } from './content.model';
import { AuthService } from '../auth/auth.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { PlaylistService } from '../playlists/playlist.service';
import { Playlist } from '../playlists/playlist.model';
import { DashboardSseService, DashboardEvent } from '../dashboard/dashboard-sse.service';
import { MetadataUpdate } from './content-detail';
import { ToastService, Toast } from '../shared/toast/toast.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

/** Drains the microtask queue so async/await continuations run before assertions. */
const tick = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'c1',
    organisationId: ORG_ID,
    title: 'Promo',
    description: null,
    tags: ['promo'],
    type: 'image',
    originalFilename: 'promo.png',
    originalMimeType: 'image/png',
    originalSizeBytes: 1000,
    transcodedSizeBytes: 500,
    thumbnailSizeBytes: null,
    transcodingStatus: 'completed',
    transcodingError: null,
    durationSeconds: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeStorage(): StorageInfo {
  return {
    originalUsedBytes: 1000,
    originalLimitBytes: 0,
    transcodedUsedBytes: 500,
    transcodedLimitBytes: 0,
  };
}

/**
 * Builds a DragEvent carrying the given files and `dataTransfer.types`.
 * jsdom has no DragEvent constructor, so we forge one off a plain Event.
 */
function makeDragEvent(opts: { files?: File[]; types?: string[]; type?: string } = {}): DragEvent {
  const files = opts.files ?? [];
  const event = new Event(opts.type ?? 'drag') as DragEvent;
  const list = {
    ...files,
    length: files.length,
    item: (i: number) => files[i],
  } as unknown as FileList;
  Object.defineProperty(event, 'dataTransfer', {
    value: { files: list, types: opts.types ?? [] } as unknown as DataTransfer,
  });
  vi.spyOn(event, 'preventDefault');
  return event;
}

/** Builds a change event whose target input carries the given files. */
function makeFileInputEvent(files: File[]): Event {
  const input = document.createElement('input');
  input.type = 'file';
  Object.defineProperty(input, 'files', {
    value: {
      ...files,
      length: files.length,
      item: (i: number) => files[i],
    } as unknown as FileList,
    configurable: true,
  });
  const event = new Event('change');
  Object.defineProperty(event, 'target', { value: input });
  return event;
}

const membership: MyMembership = {
  id: 'm1',
  userId: 'u1',
  organisationId: ORG_ID,
  role: 'org_admin',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('ContentLibrary', () => {
  let fixture: ComponentFixture<ContentLibrary>;
  let component: ContentLibrary;
  let httpMock: HttpTestingController;
  let memberService: { getMyMemberships: ReturnType<typeof vi.fn> };
  let playlistService: { getAll: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let sse: DashboardSseService;
  let toastService: ToastService;

  function lastToast(): Toast | undefined {
    return toastService.toasts().at(-1);
  }

  function makeSseStub(): DashboardSseService {
    return {
      transcodingProgress$: new Subject<DashboardEvent>(),
      transcodingComplete$: new Subject<DashboardEvent>(),
      transcodingFailed$: new Subject<DashboardEvent>(),
    } as unknown as DashboardSseService;
  }

  /** Answers the GET /api/content and GET storage requests issued on init. */
  function answerInitialLoad(contents: Content[], storage: StorageInfo = makeStorage()): void {
    httpMock.expectOne('/api/content').flush(contents);
    httpMock.expectOne(`/api/organisations/${ORG_ID}/storage`).flush(storage);
  }

  beforeEach(() => {
    memberService = { getMyMemberships: vi.fn().mockReturnValue(of([membership])) };
    playlistService = { getAll: vi.fn() };
    router = { navigate: vi.fn() };
    sse = makeSseStub();

    TestBed.configureTestingModule({
      imports: [ContentLibrary],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'tok' } },
        {
          provide: OrganisationStateService,
          useValue: {
            selectedOrgId: () => ORG_ID,
            selectedOrg: () => ({ id: ORG_ID, name: 'Org', timeZone: 'UTC', role: 'OrgAdmin' }),
          },
        },
        { provide: MemberService, useValue: memberService },
        { provide: PlaylistService, useValue: playlistService },
        { provide: DashboardSseService, useValue: sse },
        { provide: Router, useValue: router },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ContentLibrary);
    component = fixture.componentInstance;
  });

  function init(contents: Content[] = [makeContent()]): void {
    component.ngOnInit(); // getMyMemberships -> loadContent + loadStorage + SSE subs
    answerInitialLoad(contents);
  }

  afterEach(() => httpMock.verify());

  it('loads content, extracts tags, and clears loading on init', () => {
    // Arrange / Act
    init([makeContent({ id: 'c1', tags: ['a'] }), makeContent({ id: 'c2', tags: ['b'] })]);

    // Assert
    expect(component.loading).toBe(false);
    expect(component.contents.length).toBe(2);
    expect(component.allTags).toEqual(['a', 'b']);
    expect(component.contentIds).toEqual(['c1', 'c2']);
  });

  it('reports a "not a member" error when there are no memberships', () => {
    // Arrange
    memberService.getMyMemberships.mockReturnValue(of([]));

    // Act
    component.ngOnInit();

    // Assert
    expect(component.loadError).toBe('You are not a member of any organisation.');
    expect(component.loading).toBe(false);
  });

  it('maps a 403 response to an access-denied message', () => {
    // Arrange / Act
    component.ngOnInit();
    httpMock.expectOne('/api/content').flush('no', { status: 403, statusText: 'Forbidden' });
    httpMock.expectOne(`/api/organisations/${ORG_ID}/storage`).flush(makeStorage());

    // Assert
    expect(component.loadError).toBe('Access denied.');
    expect(component.loading).toBe(false);
  });

  it('filters content by type', () => {
    // Arrange
    init([makeContent({ id: 'c1', type: 'image' }), makeContent({ id: 'c2', type: 'video' })]);

    // Act
    component.setTypeFilter('video');

    // Assert
    expect(component.filteredContent.map((c) => c.id)).toEqual(['c2']);
  });

  it('toggles a tag filter on and off', () => {
    // Arrange
    init([makeContent({ id: 'c1', tags: ['promo'] }), makeContent({ id: 'c2', tags: ['news'] })]);

    // Act: add filter
    component.toggleTag('promo');
    // Assert
    expect(component.filteredContent.map((c) => c.id)).toEqual(['c1']);

    // Act: remove filter
    component.toggleTag('promo');
    // Assert
    expect(component.filteredContent.length).toBe(2);
  });

  it('clears all tag filters', () => {
    // Arrange
    init([makeContent({ id: 'c1', tags: ['promo'] })]);
    component.toggleTag('promo');

    // Act
    component.clearTags();

    // Assert
    expect(component.filterTags).toEqual([]);
    expect(component.filteredContent.length).toBe(1);
  });

  it('uploads a file, tracking progress and prepending the completed content', () => {
    // Arrange
    init([]);
    const file = new File(['x'], 'new.png', { type: 'image/png' });

    // Act
    component.uploadFiles([file]);
    const req = httpMock.expectOne('/api/content/upload');
    // simulate progress
    req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    // Assert progress
    expect(component.uploads[0].progress).toBe(50);

    // Act: complete
    const created = makeContent({ id: 'c-new', title: 'new', tags: ['fresh'] });
    req.flush(created);
    // storage reloads after a completed upload
    httpMock.expectOne(`/api/organisations/${ORG_ID}/storage`).flush(makeStorage());

    // Assert
    expect(component.uploads[0].status).toBe('done');
    expect(component.contents[0].id).toBe('c-new');
    expect(component.allTags).toContain('fresh');
  });

  it('marks an upload as errored when the request fails', () => {
    // Arrange
    init([]);
    const file = new File(['x'], 'bad.png', { type: 'image/png' });

    // Act
    component.uploadFiles([file]);
    httpMock
      .expectOne('/api/content/upload')
      .flush({ message: 'Too large' }, { status: 413, statusText: 'Payload Too Large' });

    // Assert
    expect(component.uploads[0].status).toBe('error');
    expect(component.uploads[0].error).toBe('Too large');
  });

  it('derives the preview url from transcoded vs original status', () => {
    // Arrange
    init([]);

    // Assert
    expect(
      component.getPreviewUrl(makeContent({ id: 'c1', transcodingStatus: 'completed' })),
    ).toContain('/api/content/c1/file/transcoded');
    expect(
      component.getPreviewUrl(makeContent({ id: 'c2', transcodingStatus: 'pending' })),
    ).toContain('/api/content/c2/file/original');
  });

  it('selects and closes the detail view', () => {
    // Arrange
    const item = makeContent();
    init([item]);

    // Act
    component.selectContent(item);
    // Assert
    expect(component.selectedContent).toBe(item);
    expect(component.metadataSaved).toBe(false);

    // Act
    component.closeDetail();
    // Assert
    expect(component.selectedContent).toBeNull();
  });

  it('saves metadata and updates the selected + list content', () => {
    // Arrange
    const item = makeContent({ id: 'c1', title: 'Old' });
    init([item]);
    component.selectContent(item);
    const update: MetadataUpdate = { title: 'New', description: 'desc', tags: ['x'] };

    // Act
    component.onDetailSave(update);
    const req = httpMock.expectOne('/api/content/c1');
    expect(req.request.method).toBe('PATCH');
    req.flush(makeContent({ id: 'c1', title: 'New', tags: ['x'] }));

    // Assert
    expect(component.savingMetadata).toBe(false);
    expect(component.metadataSaved).toBe(true);
    expect(component.selectedContent?.title).toBe('New');
    expect(component.contents[0].title).toBe('New');
  });

  it('surfaces a metadata save error', () => {
    // Arrange
    const item = makeContent({ id: 'c1' });
    init([item]);
    component.selectContent(item);

    // Act
    component.onDetailSave({ title: 'x', description: '', tags: [] });
    httpMock
      .expectOne('/api/content/c1')
      .flush({ message: 'nope' }, { status: 400, statusText: 'Bad Request' });

    // Assert
    expect(component.metadataError).toBe('nope');
    expect(component.savingMetadata).toBe(false);
  });

  it('deletes the selected content and removes it from the list', () => {
    // Arrange
    const item = makeContent({ id: 'c1' });
    init([item, makeContent({ id: 'c2' })]);
    component.selectContent(item);
    component.confirmDelete();
    expect(component.showDeleteConfirm).toBe(true);

    // Act
    component.executeDelete();
    httpMock.expectOne('/api/content/c1').flush(null);
    httpMock.expectOne(`/api/organisations/${ORG_ID}/storage`).flush(makeStorage());

    // Assert
    expect(component.contents.map((c) => c.id)).toEqual(['c2']);
    expect(component.selectedContent).toBeNull();
    expect(component.showDeleteConfirm).toBe(false);
  });

  it('cancels a pending delete', () => {
    // Arrange
    init([makeContent()]);
    component.confirmDelete();

    // Act
    component.cancelDelete();

    // Assert
    expect(component.showDeleteConfirm).toBe(false);
  });

  it('updates content state on a transcoding-complete SSE event', () => {
    // Arrange
    const item = makeContent({ id: 'c1', transcodingStatus: 'processing' });
    init([item]);

    // Act
    (sse.transcodingComplete$ as Subject<DashboardEvent>).next({
      type: 'transcoding.complete',
      data: { contentId: 'c1', transcodedSizeBytes: 999 },
      timestamp: 't',
    });
    // complete handler reloads storage
    httpMock.expectOne(`/api/organisations/${ORG_ID}/storage`).flush(makeStorage());

    // Assert
    expect(component.contents[0].transcodingStatus).toBe('completed');
    expect(component.contents[0].transcodedSizeBytes).toBe(999);
  });

  it('marks content failed on a transcoding-failed SSE event', () => {
    // Arrange
    const item = makeContent({ id: 'c1', transcodingStatus: 'processing' });
    init([item]);

    // Act
    (sse.transcodingFailed$ as Subject<DashboardEvent>).next({
      type: 'transcoding.failed',
      data: { contentId: 'c1', error: 'bad codec' },
      timestamp: 't',
    });

    // Assert
    expect(component.contents[0].transcodingStatus).toBe('failed');
    expect(component.contents[0].transcodingError).toBe('bad codec');
  });

  it('records progress and flips status to processing on a progress SSE event', () => {
    // Arrange
    const item = makeContent({ id: 'c1', transcodingStatus: 'pending' });
    init([item]);

    // Act
    (sse.transcodingProgress$ as Subject<DashboardEvent>).next({
      type: 'transcoding.progress',
      data: { contentId: 'c1', progress: 30 },
      timestamp: 't',
    });

    // Assert
    expect(component.transcodingProgress['c1']).toBe(30);
    expect(component.contents[0].transcodingStatus).toBe('processing');
  });

  it('runs a bulk delete after confirmation and shows a success toast', async () => {
    // Arrange
    init([makeContent({ id: 'c1' }), makeContent({ id: 'c2' })]);
    component.selectionService.selectAll(['c1', 'c2']);
    const promise = component.handleBulkDelete();
    expect(component.showBulkDeleteConfirm).toBe(true);

    // Act: confirm
    component.onBulkDeleteConfirmed(true);
    await tick();
    const req = httpMock.expectOne('/api/content/bulk-delete');
    expect(req.request.body).toEqual({ ids: ['c1', 'c2'] });
    req.flush({ deleted: 2, notFound: [] });
    await tick();
    // handleBulkDelete reloads content + storage
    answerInitialLoad([makeContent({ id: 'c2' })]);
    await promise;

    // Assert
    expect(lastToast()?.message).toContain('2 item(s) deleted');
    expect(lastToast()?.type).toBe('success');
  });

  it('rejects the bulk delete when the user cancels the confirmation', async () => {
    // Arrange
    init([makeContent({ id: 'c1' })]);
    component.selectionService.selectAll(['c1']);
    const promise = component.handleBulkDelete();

    // Act
    component.onBulkDeleteConfirmed(false);

    // Assert
    await expect(promise).rejects.toThrow('cancelled');
  });

  it('runs a bulk add-tag flow and reloads content', async () => {
    // Arrange
    init([makeContent({ id: 'c1' })]);
    component.selectionService.selectAll(['c1']);
    const promise = component.handleBulkTag('add');
    component.bulkTagInput = 'promo, news';

    // Act
    component.executeTagModal();
    await tick();
    const req = httpMock.expectOne('/api/content/bulk-tag');
    expect(req.request.body).toEqual({ ids: ['c1'], tags: ['promo', 'news'] });
    req.flush({ updated: 1, notFound: [] });
    await tick();
    // handleBulkTag only reloads content (not storage)
    httpMock.expectOne('/api/content').flush([makeContent({ id: 'c1' })]);
    await promise;

    // Assert
    expect(lastToast()?.message).toContain('1 item(s) tagged');
    expect(lastToast()?.type).toBe('success');
  });

  it('rejects the bulk tag flow when no tags are entered', async () => {
    // Arrange
    init([makeContent({ id: 'c1' })]);
    component.selectionService.selectAll(['c1']);
    const promise = component.handleBulkTag('add');
    component.bulkTagInput = '   ';

    // Act
    component.executeTagModal();

    // Assert
    await expect(promise).rejects.toThrow('cancelled');
  });

  it('loads playlists when opening the add-to-playlist modal and bulk-adds on confirm', async () => {
    // Arrange
    init([makeContent({ id: 'c1' })]);
    component.selectionService.selectAll(['c1']);
    const playlist: Playlist = {
      id: 'p1',
      organisationId: ORG_ID,
      name: 'Lobby',
      color: '#6d6cf6',
      items: [],
      createdAt: 't',
      updatedAt: 't',
    };
    playlistService.getAll.mockReturnValue(of([playlist]));

    // Act: open modal -> playlists load synchronously via stub
    const promise = component.handleBulkAddToPlaylist();
    expect(component.showPlaylistModal).toBe(true);
    expect(component.playlists).toEqual([playlist]);
    expect(component.playlistsLoading).toBe(false);

    component.selectedPlaylistId = 'p1';
    component.executePlaylistModal();
    await tick();
    const req = httpMock.expectOne('/api/content/bulk-add-to-playlist');
    expect(req.request.body).toEqual({ ids: ['c1'], playlistId: 'p1' });
    req.flush({ added: 1, alreadyPresent: 0, notFound: [] });
    await tick();
    // handleBulkAddToPlaylist only reloads content (not storage)
    httpMock.expectOne('/api/content').flush([makeContent({ id: 'c1' })]);
    await promise;

    // Assert
    expect(lastToast()?.message).toContain('1 item(s) added to Lobby');
    expect(lastToast()?.type).toBe('success');
  });

  it('surfaces a playlist load error in the modal state', async () => {
    // Arrange
    init([makeContent({ id: 'c1' })]);
    component.selectionService.selectAll(['c1']);
    playlistService.getAll.mockReturnValue(throwError(() => new Error('boom')));

    // Act
    const promise = component.handleBulkAddToPlaylist();

    // Assert
    expect(component.playlistsLoadError).toBe('Failed to load playlists.');
    expect(component.playlistsLoading).toBe(false);

    // cancelling resolves the modal as not-confirmed -> the flow aborts
    component.cancelPlaylistModal();
    await expect(promise).rejects.toThrow('cancelled');
  });

  it('shows an info toast for not-found items in a bulk delete', async () => {
    // Arrange
    init([makeContent({ id: 'c1' })]);
    component.selectionService.selectAll(['c1']);
    const promise = component.handleBulkDelete();
    component.onBulkDeleteConfirmed(true);
    await tick();

    // Act
    httpMock.expectOne('/api/content/bulk-delete').flush({ deleted: 0, notFound: ['c1'] });
    await tick();
    answerInitialLoad([]);
    await promise;

    // Assert
    expect(lastToast()?.message).toContain('could not be found');
    expect(lastToast()?.type).toBe('info');
  });

  describe('page-wide drag & drop', () => {
    it('shows the overlay on a file dragenter and prevents the default', () => {
      // Arrange
      const event = makeDragEvent({ types: ['Files'] });

      // Act
      component.onDragEnter(event);

      // Assert
      expect(component.isDragOver).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('ignores a non-file drag (e.g. selected text)', () => {
      // Arrange
      const event = makeDragEvent({ types: ['text/plain'] });

      // Act
      component.onDragEnter(event);

      // Assert
      expect(component.isDragOver).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('keeps the overlay until the last nested dragleave resolves', () => {
      // Arrange: cursor enters the page then a child element
      component.onDragEnter(makeDragEvent({ types: ['Files'] }));
      component.onDragEnter(makeDragEvent({ types: ['Files'] }));

      // Act: leaving the child still leaves the page
      component.onDragLeave(makeDragEvent());
      // Assert
      expect(component.isDragOver).toBe(true);

      // Act: leaving the page itself
      component.onDragLeave(makeDragEvent());
      // Assert
      expect(component.isDragOver).toBe(false);
    });

    it('does not let the leave counter underflow below zero', () => {
      // Act: a stray leave with no matching enter
      component.onDragLeave(makeDragEvent());
      component.onDragEnter(makeDragEvent({ types: ['Files'] }));

      // Assert: one enter still shows the overlay (counter was clamped at 0)
      expect(component.isDragOver).toBe(true);
    });

    it('uploads dropped files and clears the overlay', () => {
      // Arrange
      const upload = vi.spyOn(component, 'uploadFiles').mockReturnValue(undefined);
      const file = new File(['x'], 'dropped.png', { type: 'image/png' });
      component.onDragEnter(makeDragEvent({ types: ['Files'] }));

      // Act
      const event = makeDragEvent({ files: [file], types: ['Files'] });
      component.onDrop(event);

      // Assert
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragOver).toBe(false);
      expect(upload).toHaveBeenCalledWith([file]);
    });

    it('ignores a drop that carries no files', () => {
      // Arrange
      const upload = vi.spyOn(component, 'uploadFiles').mockReturnValue(undefined);
      component.onDragEnter(makeDragEvent({ types: ['Files'] }));

      // Act
      component.onDrop(makeDragEvent({ files: [], types: ['Files'] }));

      // Assert
      expect(component.isDragOver).toBe(false);
      expect(upload).not.toHaveBeenCalled();
    });

    it('does not react to drag events while the detail view is open', () => {
      // Arrange
      const upload = vi.spyOn(component, 'uploadFiles').mockReturnValue(undefined);
      component.selectedContent = makeContent();
      const enter = makeDragEvent({ types: ['Files'] });
      const drop = makeDragEvent({ files: [new File(['x'], 'd.png')], types: ['Files'] });

      // Act
      component.onDragEnter(enter);
      component.onDrop(drop);

      // Assert
      expect(component.isDragOver).toBe(false);
      expect(enter.preventDefault).not.toHaveBeenCalled();
      expect(upload).not.toHaveBeenCalled();
    });

    it('uploads files picked via Browse and resets the input value', () => {
      // Arrange
      const upload = vi.spyOn(component, 'uploadFiles').mockReturnValue(undefined);
      const file = new File(['x'], 'picked.png', { type: 'image/png' });
      const event = makeFileInputEvent([file]);

      // Act
      component.onBrowse(event);

      // Assert
      expect(upload).toHaveBeenCalledWith([file]);
      expect((event.target as HTMLInputElement).value).toBe('');
    });

    it('does nothing when Browse is dismissed without picking a file', () => {
      // Arrange
      const upload = vi.spyOn(component, 'uploadFiles').mockReturnValue(undefined);

      // Act
      component.onBrowse(makeFileInputEvent([]));

      // Assert
      expect(upload).not.toHaveBeenCalled();
    });

    /** Wires the host into a <main class="content"> and (re)binds the drop zone. */
    function mountInsideContent(): HTMLElement {
      const main = document.createElement('main');
      main.className = 'content';
      vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({
        top: 10,
        left: 20,
        width: 300,
        height: 400,
      } as DOMRect);
      document.body.appendChild(main);
      main.appendChild(fixture.nativeElement);
      (component as unknown as { attachContentDropZone(): void }).attachContentDropZone();
      return main;
    }

    it('binds drag handling to the main.content ancestor and sizes the overlay to it', () => {
      // Arrange
      const main = mountInsideContent();

      // Act: a file drag entering the content area
      main.dispatchEvent(makeDragEvent({ type: 'dragenter', types: ['Files'] }));

      // Assert: overlay spans the whole content element, not the inner column
      expect(component.isDragOver).toBe(true);
      expect(component.overlayRect).toEqual({ top: 10, left: 20, width: 300, height: 400 });

      // Act: leaving the content area
      main.dispatchEvent(makeDragEvent({ type: 'dragleave' }));
      // Assert
      expect(component.isDragOver).toBe(false);

      document.body.removeChild(main);
    });

    it('uploads a file dropped anywhere on the main.content ancestor', () => {
      // Arrange
      const upload = vi.spyOn(component, 'uploadFiles').mockReturnValue(undefined);
      const main = mountInsideContent();
      const file = new File(['x'], 'anywhere.png', { type: 'image/png' });

      // Act
      main.dispatchEvent(makeDragEvent({ type: 'drop', files: [file], types: ['Files'] }));

      // Assert
      expect(upload).toHaveBeenCalledWith([file]);
      expect(component.isDragOver).toBe(false);

      document.body.removeChild(main);
    });

    it('removes the content drag listeners on destroy', () => {
      // Arrange
      const upload = vi.spyOn(component, 'uploadFiles').mockReturnValue(undefined);
      const main = mountInsideContent();

      // Act
      component.ngOnDestroy();
      main.dispatchEvent(makeDragEvent({ type: 'dragenter', types: ['Files'] }));
      main.dispatchEvent(
        makeDragEvent({ type: 'drop', files: [new File(['x'], 'x.png')], types: ['Files'] }),
      );

      // Assert: listeners were torn down, so nothing reacts
      expect(component.isDragOver).toBe(false);
      expect(upload).not.toHaveBeenCalled();

      document.body.removeChild(main);
    });
  });
});
