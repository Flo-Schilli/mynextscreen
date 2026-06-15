import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { of, throwError } from 'rxjs';
import { Playlists } from './playlists';
import { Playlist, PlaylistItem } from './playlist.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { OrganisationService } from '../admin/organisations/organisation.service';
import { Organisation } from '../admin/organisations/organisation.model';
import { ContentService } from '../content/content.service';
import { Content } from '../content/content.model';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { ToastService, Toast } from '../shared/toast/toast.service';

const ORG_ID = 'org1';

function membership(role: MyMembership['role'], organisationId = ORG_ID): MyMembership {
  return {
    id: 'm-' + role,
    userId: 'u1',
    organisationId,
    role,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function buildPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'p1',
    organisationId: ORG_ID,
    name: 'Lobby Loop',
    color: '#6d6cf6',
    items: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function buildItem(overrides: Partial<PlaylistItem> = {}): PlaylistItem {
  return {
    id: 'i1',
    playlistId: 'p1',
    contentId: 'c1',
    position: 0,
    durationSeconds: 10,
    transition: 'fade',
    transitionDurationMs: 500,
    ...overrides,
  };
}

function buildContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'c1',
    organisationId: ORG_ID,
    title: 'Clip',
    description: null,
    tags: [],
    type: 'image',
    originalFilename: 'clip.png',
    originalMimeType: 'image/png',
    originalSizeBytes: 100,
    transcodedSizeBytes: 50,
    transcodingStatus: 'completed',
    transcodingError: null,
    durationSeconds: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function buildScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 's1',
    organisationId: ORG_ID,
    name: 'Lobby TV',
    resolution: '1920x1080',
    location: 'Lobby',
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

interface MemberStub {
  getMyMemberships: ReturnType<typeof vi.fn>;
}
interface OrgStub {
  getOne: ReturnType<typeof vi.fn>;
}
interface ContentStub {
  getAll: ReturnType<typeof vi.fn>;
  getTranscodedUrl: ReturnType<typeof vi.fn>;
}
interface ScreenStub {
  getAll: ReturnType<typeof vi.fn>;
}

describe('Playlists', () => {
  let fixture: ComponentFixture<Playlists>;
  let component: Playlists;
  let httpMock: HttpTestingController;
  let memberStub: MemberStub;
  let orgStub: OrgStub;
  let contentStub: ContentStub;
  let screenStub: ScreenStub;
  let router: Router;
  let toastService: ToastService;

  function lastToast(): Toast | undefined {
    return toastService.toasts().at(-1);
  }

  beforeEach(async () => {
    memberStub = { getMyMemberships: vi.fn(() => of([membership('org_admin')])) };
    orgStub = { getOne: vi.fn(() => of({ defaultPlaylistId: null } as Organisation)) };
    contentStub = {
      getAll: vi.fn(() => of([])),
      getTranscodedUrl: vi.fn((id: string) => `/media/${id}`),
    };
    screenStub = { getAll: vi.fn(() => of([])) };

    await TestBed.configureTestingModule({
      imports: [Playlists],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MemberService, useValue: memberStub },
        { provide: OrganisationService, useValue: orgStub },
        { provide: ContentService, useValue: contentStub },
        { provide: ScreenService, useValue: screenStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Playlists);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    toastService = TestBed.inject(ToastService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  /** Drain queued microtasks so awaited promise continuations run (zoneless). */
  async function flushMicrotasks(): Promise<void> {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  }

  /** Boot ngOnInit and flush the initial playlist + default-playlist loads. */
  function init(playlists: Playlist[] = []): void {
    fixture.detectChanges(); // triggers ngOnInit
    const req = httpMock.expectOne('/api/playlists');
    expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
    req.flush(playlists);
  }

  describe('org context resolution', () => {
    it('prefers an org_admin membership and sets isOrgAdmin', () => {
      memberStub.getMyMemberships.mockReturnValue(
        of([membership('viewer', 'orgX'), membership('org_admin', ORG_ID)]),
      );
      init();

      expect(component.orgId).toBe(ORG_ID);
      expect(component.isOrgAdmin).toBe(true);
    });

    it('falls back to the first membership when no admin role exists', () => {
      memberStub.getMyMemberships.mockReturnValue(of([membership('editor', 'orgE')]));
      fixture.detectChanges();
      httpMock.expectOne('/api/playlists').flush([]);

      expect(component.orgId).toBe('orgE');
      expect(component.isOrgAdmin).toBe(false);
    });

    it('sets a load error when the user has no memberships', () => {
      memberStub.getMyMemberships.mockReturnValue(of([]));
      fixture.detectChanges();

      expect(component.loadError).toContain('not a member');
      expect(component.loading).toBe(false);
      httpMock.expectNone('/api/playlists');
    });

    it('sets a load error when membership lookup fails', () => {
      memberStub.getMyMemberships.mockReturnValue(throwError(() => new Error('nope')));
      fixture.detectChanges();

      expect(component.loadError).toContain('organisation context');
      expect(component.loading).toBe(false);
    });

    it('captures the default playlist id from the organisation', () => {
      orgStub.getOne.mockReturnValue(of({ defaultPlaylistId: 'p9' } as Organisation));
      init();

      expect(component.defaultPlaylistId).toBe('p9');
    });

    it('leaves the default playlist id null when org lookup is forbidden', () => {
      orgStub.getOne.mockReturnValue(throwError(() => ({ status: 403 })));
      init();

      expect(component.defaultPlaylistId).toBeNull();
    });
  });

  describe('loadPlaylists', () => {
    it('stores playlists and their ids on success', () => {
      init([buildPlaylist({ id: 'p1' }), buildPlaylist({ id: 'p2' })]);

      expect(component.playlists.length).toBe(2);
      expect(component.playlistIds).toEqual(['p1', 'p2']);
      expect(component.loading).toBe(false);
    });

    it('maps a 403 to an access-denied error', () => {
      fixture.detectChanges();
      httpMock.expectOne('/api/playlists').flush('forbidden', {
        status: 403,
        statusText: 'Forbidden',
      });

      expect(component.loadError).toBe('Access denied.');
    });

    it('maps other errors to a generic message', () => {
      fixture.detectChanges();
      httpMock.expectOne('/api/playlists').flush('boom', {
        status: 500,
        statusText: 'Server Error',
      });

      expect(component.loadError).toBe('Failed to load playlists.');
    });
  });

  describe('create flow', () => {
    beforeEach(() => init());

    it('opens the create form with cleared state', () => {
      component.createName = 'old';
      component.createError = 'old error';
      component.openCreateForm();

      expect(component.showCreateForm).toBe(true);
      expect(component.createName).toBe('');
      expect(component.createError).toBe('');
    });

    it('rejects an empty name without an HTTP call', () => {
      component.createName = '   ';
      component.submitCreate();

      expect(component.createError).toBe('Name is required.');
      httpMock.expectNone('/api/playlists');
    });

    it('creates, reloads and selects the new playlist on success', () => {
      component.openCreateForm();
      component.createName = '  New  ';
      component.submitCreate();

      const post = httpMock.expectOne((r) => r.method === 'POST' && r.url === '/api/playlists');
      expect(post.request.body).toEqual({ name: 'New', color: '#6d6cf6' });
      const created = buildPlaylist({ id: 'pNew', name: 'New' });
      post.flush(created);

      // reload list
      httpMock.expectOne('/api/playlists').flush([created]);
      // selectPlaylist re-fetches detail
      httpMock.expectOne('/api/playlists/pNew').flush(created);

      expect(component.creating).toBe(false);
      expect(component.showCreateForm).toBe(false);
      expect(component.selectedPlaylist?.id).toBe('pNew');
    });

    it('surfaces a server error message on create failure', () => {
      component.createName = 'X';
      component.submitCreate();

      httpMock
        .expectOne((r) => r.method === 'POST' && r.url === '/api/playlists')
        .flush({ message: 'duplicate' }, { status: 400, statusText: 'Bad Request' });

      expect(component.createError).toBe('duplicate');
      expect(component.creating).toBe(false);
    });

    it('cancels the create form', () => {
      component.openCreateForm();
      component.cancelCreate();
      expect(component.showCreateForm).toBe(false);
    });
  });

  describe('detail selection', () => {
    beforeEach(() => init([buildPlaylist({ id: 'p1' })]));

    it('loads the full playlist detail on select', () => {
      const full = buildPlaylist({ id: 'p1', items: [buildItem()] });
      component.selectPlaylist(buildPlaylist({ id: 'p1' }));
      httpMock.expectOne('/api/playlists/p1').flush(full);

      expect(component.selectedPlaylist?.items.length).toBe(1);
      expect(component.editorError).toBe('');
    });

    it('sets an editor error when detail load fails', () => {
      component.selectPlaylist(buildPlaylist({ id: 'p1' }));
      httpMock
        .expectOne('/api/playlists/p1')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(component.editorError).toContain('Failed to load playlist details');
    });

    it('closeDetail clears selection and reloads the list', () => {
      component.selectedPlaylist = buildPlaylist();
      component.closeDetail();
      httpMock.expectOne('/api/playlists').flush([]);

      expect(component.selectedPlaylist).toBeNull();
    });
  });

  describe('rename', () => {
    beforeEach(() => init());

    it('patches the playlist name and updates local state on success', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1', name: 'Old' });
      component.onRename('New');

      const req = httpMock.expectOne('/api/playlists/p1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ name: 'New', color: '#6d6cf6' });
      req.flush(buildPlaylist({ id: 'p1', name: 'New' }));

      expect(component.selectedPlaylist?.name).toBe('New');
    });

    it('no-ops without a selected playlist', () => {
      component.selectedPlaylist = null;
      component.onRename('x');
      httpMock.expectNone('/api/playlists/p1');
    });

    it('surfaces a rename error', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1' });
      component.onRename('New');
      httpMock
        .expectOne('/api/playlists/p1')
        .flush({ message: 'taken' }, { status: 409, statusText: 'Conflict' });

      expect(component.editorError).toBe('taken');
    });
  });

  describe('delete', () => {
    beforeEach(() => init());

    it('toggles the confirm modal', () => {
      component.confirmDelete();
      expect(component.showDeleteConfirm).toBe(true);
      component.cancelDelete();
      expect(component.showDeleteConfirm).toBe(false);
    });

    it('deletes and clears the default id when deleting the default playlist', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1' });
      component.defaultPlaylistId = 'p1';
      component.executeDelete();

      const req = httpMock.expectOne('/api/playlists/p1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      httpMock.expectOne('/api/playlists').flush([]);

      expect(component.selectedPlaylist).toBeNull();
      expect(component.defaultPlaylistId).toBeNull();
      expect(component.deleting).toBe(false);
    });

    it('surfaces a delete error and hides the modal', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1' });
      component.showDeleteConfirm = true;
      component.executeDelete();
      httpMock
        .expectOne('/api/playlists/p1')
        .flush({ message: 'in use' }, { status: 409, statusText: 'Conflict' });

      expect(component.editorError).toBe('in use');
      expect(component.showDeleteConfirm).toBe(false);
    });
  });

  describe('toggleDefault', () => {
    beforeEach(() => init());

    it('sets this playlist as default when it is not already', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1' });
      component.defaultPlaylistId = null;
      component.toggleDefault();

      const req = httpMock.expectOne(`/api/organisations/${ORG_ID}/default-playlist`);
      expect(req.request.body).toEqual({ playlistId: 'p1' });
      req.flush({});

      expect(component.defaultPlaylistId).toBe('p1');
      expect(component.settingDefault).toBe(false);
    });

    it('clears the default when this playlist is already default', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1' });
      component.defaultPlaylistId = 'p1';
      component.toggleDefault();

      const req = httpMock.expectOne(`/api/organisations/${ORG_ID}/default-playlist`);
      expect(req.request.body).toEqual({ playlistId: null });
      req.flush({});

      expect(component.defaultPlaylistId).toBeNull();
    });

    it('surfaces an error on failure', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1' });
      component.toggleDefault();
      httpMock
        .expectOne(`/api/organisations/${ORG_ID}/default-playlist`)
        .flush({ message: 'denied' }, { status: 403, statusText: 'Forbidden' });

      expect(component.editorError).toBe('denied');
      expect(component.settingDefault).toBe(false);
    });
  });

  describe('add content', () => {
    beforeEach(() => init());

    it('loads available content when opening the modal', () => {
      contentStub.getAll.mockReturnValue(of([buildContent()]));
      component.openAddContent();

      expect(component.showAddContent).toBe(true);
      expect(component.availableContent.length).toBe(1);
      expect(component.contentLoading).toBe(false);
    });

    it('falls back to an empty list when content load fails', () => {
      contentStub.getAll.mockReturnValue(throwError(() => new Error('x')));
      component.openAddContent();

      expect(component.availableContent).toEqual([]);
      expect(component.contentLoading).toBe(false);
    });

    it('adds an image with a 10s default duration and reloads', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1' });
      component.addContentToPlaylist(buildContent({ id: 'cImg', type: 'image' }));

      const post = httpMock.expectOne('/api/playlists/p1/items');
      expect(post.request.body).toEqual({
        contentId: 'cImg',
        durationSeconds: 10,
        transition: 'fade',
        transitionDurationMs: 500,
      });
      post.flush(buildItem());
      httpMock.expectOne('/api/playlists/p1').flush(buildPlaylist({ id: 'p1' }));
    });

    it('adds a video using its own duration as default', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1' });
      component.addContentToPlaylist(
        buildContent({ id: 'cVid', type: 'video', durationSeconds: 42 }),
      );

      const post = httpMock.expectOne('/api/playlists/p1/items');
      expect(post.request.body.durationSeconds).toBe(42);
      post.flush(buildItem());
      httpMock.expectOne('/api/playlists/p1').flush(buildPlaylist({ id: 'p1' }));
    });

    it('uses 30s when a video has no known duration', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1' });
      component.addContentToPlaylist(
        buildContent({ id: 'cVid', type: 'video', durationSeconds: null }),
      );

      const post = httpMock.expectOne('/api/playlists/p1/items');
      expect(post.request.body.durationSeconds).toBe(30);
      post.flush(buildItem());
      httpMock.expectOne('/api/playlists/p1').flush(buildPlaylist({ id: 'p1' }));
    });

    it('surfaces an add error', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1' });
      component.addContentToPlaylist(buildContent());
      httpMock
        .expectOne('/api/playlists/p1/items')
        .flush({ message: 'limit' }, { status: 400, statusText: 'Bad Request' });

      expect(component.editorError).toBe('limit');
    });

    it('closeAddContent hides the modal', () => {
      component.showAddContent = true;
      component.closeAddContent();
      expect(component.showAddContent).toBe(false);
    });
  });

  describe('remove item', () => {
    beforeEach(() => init());

    it('removes the item and clears a matching preview, then reloads', () => {
      const item = buildItem({ id: 'iRm' });
      component.selectedPlaylist = buildPlaylist({ id: 'p1', items: [item] });
      component.previewingItem = item;
      component.removeItem(item);

      const del = httpMock.expectOne('/api/playlists/p1/items/iRm');
      expect(del.request.method).toBe('DELETE');
      del.flush(null);
      httpMock.expectOne('/api/playlists/p1').flush(buildPlaylist({ id: 'p1' }));

      expect(component.previewingItem).toBeNull();
    });

    it('surfaces a remove error', () => {
      const item = buildItem({ id: 'iRm' });
      component.selectedPlaylist = buildPlaylist({ id: 'p1', items: [item] });
      component.removeItem(item);
      httpMock
        .expectOne('/api/playlists/p1/items/iRm')
        .flush({ message: 'no' }, { status: 500, statusText: 'Server Error' });

      expect(component.editorError).toBe('no');
    });
  });

  describe('reorder', () => {
    beforeEach(() => init());

    it('reorders items locally and PUTs the new order', () => {
      component.selectedPlaylist = buildPlaylist({
        id: 'p1',
        items: [buildItem({ id: 'a' }), buildItem({ id: 'b' }), buildItem({ id: 'c' })],
      });
      component.onDrop({ previousIndex: 0, currentIndex: 2 } as CdkDragDrop<PlaylistItem[]>);

      expect(component.selectedPlaylist?.items.map((i) => i.id)).toEqual(['b', 'c', 'a']);
      const put = httpMock.expectOne('/api/playlists/p1/items/reorder');
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual({ itemIds: ['b', 'c', 'a'] });
      put.flush([]);
    });

    it('does nothing when the index did not change', () => {
      component.selectedPlaylist = buildPlaylist({ id: 'p1', items: [buildItem({ id: 'a' })] });
      component.onDrop({ previousIndex: 1, currentIndex: 1 } as CdkDragDrop<PlaylistItem[]>);
      httpMock.expectNone('/api/playlists/p1/items/reorder');
    });

    it('reloads and surfaces an error when the reorder request fails', () => {
      component.selectedPlaylist = buildPlaylist({
        id: 'p1',
        items: [buildItem({ id: 'a' }), buildItem({ id: 'b' })],
      });
      component.onDrop({ previousIndex: 0, currentIndex: 1 } as CdkDragDrop<PlaylistItem[]>);

      httpMock
        .expectOne('/api/playlists/p1/items/reorder')
        .flush({ message: 'fail' }, { status: 500, statusText: 'Server Error' });
      httpMock.expectOne('/api/playlists/p1').flush(buildPlaylist({ id: 'p1' }));

      expect(component.editorError).toBe('fail');
    });
  });

  describe('debounced item field updates', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      init();
    });

    it('ignores a duration below 1 second', () => {
      const item = buildItem({ id: 'i1', durationSeconds: 10 });
      component.selectedPlaylist = buildPlaylist({ id: 'p1', items: [item] });
      component.updateItemDuration(item, 0);

      expect(item.durationSeconds).toBe(10);
      vi.advanceTimersByTime(900);
      httpMock.expectNone('/api/playlists/p1/items/i1');
    });

    it('patches the duration after the debounce window', () => {
      const item = buildItem({ id: 'i1' });
      component.selectedPlaylist = buildPlaylist({ id: 'p1', items: [item] });
      component.updateItemDuration(item, 25);
      expect(item.durationSeconds).toBe(25);

      vi.advanceTimersByTime(800);
      const patch = httpMock.expectOne('/api/playlists/p1/items/i1');
      expect(patch.request.body).toEqual({ durationSeconds: 25 });
      patch.flush(item);
      httpMock.expectOne('/api/playlists/p1').flush(buildPlaylist({ id: 'p1' }));
    });

    it('debounces rapid duration edits into a single PATCH', () => {
      const item = buildItem({ id: 'i1' });
      component.selectedPlaylist = buildPlaylist({ id: 'p1', items: [item] });
      component.updateItemDuration(item, 11);
      vi.advanceTimersByTime(400);
      component.updateItemDuration(item, 12);
      vi.advanceTimersByTime(800);

      const patch = httpMock.expectOne('/api/playlists/p1/items/i1');
      expect(patch.request.body).toEqual({ durationSeconds: 12 });
      patch.flush(item);
      httpMock.expectOne('/api/playlists/p1').flush(buildPlaylist({ id: 'p1' }));
    });

    it('patches a transition change', () => {
      const item = buildItem({ id: 'i1' });
      component.selectedPlaylist = buildPlaylist({ id: 'p1', items: [item] });
      component.updateItemTransition(item, 'zoom-in');
      expect(item.transition).toBe('zoom-in');

      vi.advanceTimersByTime(800);
      const patch = httpMock.expectOne('/api/playlists/p1/items/i1');
      expect(patch.request.body).toEqual({ transition: 'zoom-in' });
      patch.flush(item);
      httpMock.expectOne('/api/playlists/p1').flush(buildPlaylist({ id: 'p1' }));
    });

    it('rejects an out-of-range transition duration', () => {
      const item = buildItem({ id: 'i1', transitionDurationMs: 500 });
      component.selectedPlaylist = buildPlaylist({ id: 'p1', items: [item] });
      component.updateItemTransitionDuration(item, 4000);

      expect(item.transitionDurationMs).toBe(500);
      vi.advanceTimersByTime(900);
      httpMock.expectNone('/api/playlists/p1/items/i1');
    });

    it('patches an in-range transition duration', () => {
      const item = buildItem({ id: 'i1' });
      component.selectedPlaylist = buildPlaylist({ id: 'p1', items: [item] });
      component.updateItemTransitionDuration(item, 1000);
      expect(item.transitionDurationMs).toBe(1000);

      vi.advanceTimersByTime(800);
      const patch = httpMock.expectOne('/api/playlists/p1/items/i1');
      expect(patch.request.body).toEqual({ transitionDurationMs: 1000 });
      patch.flush(item);
      httpMock.expectOne('/api/playlists/p1').flush(buildPlaylist({ id: 'p1' }));
    });
  });

  describe('preview', () => {
    beforeEach(() => init());

    it('toggles the preview on and off for the same item', () => {
      const item = buildItem({ id: 'i1' });
      component.previewItem(item);
      expect(component.previewingItem).toBe(item);
      component.previewItem(item);
      expect(component.previewingItem).toBeNull();
    });

    it('switches preview to a different item', () => {
      const a = buildItem({ id: 'a' });
      const b = buildItem({ id: 'b' });
      component.previewItem(a);
      component.previewItem(b);
      expect(component.previewingItem).toBe(b);
    });

    it('closePreview clears the previewing item', () => {
      component.previewingItem = buildItem();
      component.closePreview();
      expect(component.previewingItem).toBeNull();
    });
  });

  describe('thumbnail url helpers', () => {
    beforeEach(() => init());

    it('delegates thumb/preview urls to the content service', () => {
      const item = buildItem({ contentId: 'cX' });
      expect(component.getThumbUrl(item)).toBe('/media/cX');
      expect(component.getPreviewUrl(item)).toBe('/media/cX');
      expect(component.getContentThumbUrl(buildContent({ id: 'cY' }))).toBe('/media/cY');
    });
  });

  describe('bulk delete', () => {
    beforeEach(() => init([buildPlaylist({ id: 'p1' }), buildPlaylist({ id: 'p2' })]));

    it('cancels: rejecting the confirm prevents any delete request', async () => {
      component.selectionService.selectAll(['p1', 'p2']);
      const promise = component.handleBulkDelete();
      expect(component.showBulkDeleteConfirm).toBe(true);

      component.onBulkDeleteConfirmed(false);
      await expect(promise).rejects.toThrow('cancelled');
      httpMock.expectNone('/api/playlists/bulk-delete');
    });

    it('deletes selected playlists, toasts success and reloads', async () => {
      component.selectionService.selectAll(['p1', 'p2']);
      const promise = component.handleBulkDelete();
      component.onBulkDeleteConfirmed(true);
      await flushMicrotasks();

      const req = httpMock.expectOne('/api/playlists/bulk-delete');
      expect(req.request.body).toEqual({ ids: ['p1', 'p2'] });
      req.flush({ deleted: 2, notFound: [] });
      await flushMicrotasks();

      httpMock.expectOne('/api/playlists').flush([]);
      await promise;

      expect(lastToast()?.message).toContain('2 playlist(s) deleted');
      expect(lastToast()?.type).toBe('success');
    });

    it('warns about not-found items after a partial bulk delete', async () => {
      component.selectionService.selectAll(['p1', 'p2']);
      const promise = component.handleBulkDelete();
      component.onBulkDeleteConfirmed(true);
      await flushMicrotasks();

      httpMock.expectOne('/api/playlists/bulk-delete').flush({ deleted: 1, notFound: ['p2'] });
      await flushMicrotasks();
      httpMock.expectOne('/api/playlists').flush([]);
      await promise;

      expect(lastToast()?.message).toContain('1 item(s) could not be found');
      expect(lastToast()?.type).toBe('info');
    });

    it('builds the confirmation message from the selection count', () => {
      component.selectionService.selectAll(['p1', 'p2']);
      expect(component.bulkDeleteMessage()).toContain('2 playlist(s)');
    });
  });

  describe('bulk assign to screen', () => {
    beforeEach(() => init([buildPlaylist({ id: 'p1' })]));

    it('loads screens when the modal opens', async () => {
      screenStub.getAll.mockReturnValue(of([buildScreen()]));
      const promise = component.handleBulkAssignScreen();

      expect(component.showAssignScreenModal).toBe(true);
      expect(component.availableScreens.length).toBe(1);
      expect(component.screensLoading).toBe(false);

      component.cancelAssignScreen();
      await expect(promise).rejects.toThrow('cancelled');
    });

    it('sets a screens load error on failure', async () => {
      screenStub.getAll.mockReturnValue(throwError(() => new Error('x')));
      const promise = component.handleBulkAssignScreen();

      expect(component.screensLoadError).toContain('Failed to load screens');
      expect(component.screensLoading).toBe(false);

      component.cancelAssignScreen();
      await expect(promise).rejects.toThrow('cancelled');
    });

    it('cancel rejects the flow without an assign request', async () => {
      screenStub.getAll.mockReturnValue(of([buildScreen()]));
      component.selectionService.selectAll(['p1']);
      const promise = component.handleBulkAssignScreen();

      component.cancelAssignScreen();
      await expect(promise).rejects.toThrow('cancelled');
      expect(component.showAssignScreenModal).toBe(false);
      httpMock.expectNone('/api/playlists/bulk-assign-screen');
    });

    it('assigns the selection to the chosen screen and toasts the screen name', async () => {
      screenStub.getAll.mockReturnValue(of([buildScreen({ id: 's1', name: 'Lobby TV' })]));
      component.selectionService.selectAll(['p1']);
      const promise = component.handleBulkAssignScreen();
      component.selectedScreenId = 's1';

      component.executeAssignScreen();
      expect(component.showAssignScreenModal).toBe(false);
      await flushMicrotasks();

      const req = httpMock.expectOne('/api/playlists/bulk-assign-screen');
      expect(req.request.body).toEqual({ ids: ['p1'], screenId: 's1' });
      req.flush({ assigned: 1, notFound: [] });
      await flushMicrotasks();
      httpMock.expectOne('/api/playlists').flush([]);
      await promise;

      expect(lastToast()?.message).toContain('assigned to Lobby TV');
      expect(lastToast()?.type).toBe('success');
    });

    it('warns about not-found items after a partial assign', async () => {
      screenStub.getAll.mockReturnValue(of([buildScreen({ id: 's1', name: 'Lobby TV' })]));
      component.selectionService.selectAll(['p1']);
      const promise = component.handleBulkAssignScreen();
      component.selectedScreenId = 's1';
      component.executeAssignScreen();
      await flushMicrotasks();

      httpMock
        .expectOne('/api/playlists/bulk-assign-screen')
        .flush({ assigned: 0, notFound: ['p1'] });
      await flushMicrotasks();
      httpMock.expectOne('/api/playlists').flush([]);
      await promise;

      expect(lastToast()?.message).toContain('could not be found');
      expect(lastToast()?.type).toBe('info');
    });
  });
});
