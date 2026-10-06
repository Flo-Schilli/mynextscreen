import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PlaylistGrid } from './playlist-grid';
import { Playlist, PlaylistItem } from './playlist.model';
import { SelectionService } from '../shared/selection/selection.service';
import { BulkAction } from '../shared/selection/bulk-action-toolbar';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

function buildPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'p1',
    organisationId: 'org1',
    name: 'Lobby Loop',
    color: '#6d6cf6',
    items: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('PlaylistGrid', () => {
  let fixture: ComponentFixture<PlaylistGrid>;
  let component: PlaylistGrid;
  let selection: SelectionService;

  const actions: BulkAction[] = [{ label: 'Delete', variant: 'danger', handler: vi.fn() }];
  const thumbUrl = (item: PlaylistItem): string => `/thumb/${item.contentId}`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PlaylistGrid,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection(), SelectionService],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaylistGrid);
    component = fixture.componentInstance;
    selection = TestBed.inject(SelectionService);
    fixture.componentRef.setInput('playlists', []);
    fixture.componentRef.setInput('playlistIds', []);
    fixture.componentRef.setInput('defaultPlaylistId', null);
    fixture.componentRef.setInput('bulkActions', actions);
    fixture.componentRef.setInput('thumbUrl', thumbUrl);
  });

  it('renders one card per playlist', () => {
    fixture.componentRef.setInput('playlists', [
      buildPlaylist({ id: 'p1' }),
      buildPlaylist({ id: 'p2' }),
    ]);
    fixture.componentRef.setInput('playlistIds', ['p1', 'p2']);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('mns-card')).length).toBe(2);
  });

  it('shows the default badge only on the default playlist', () => {
    fixture.componentRef.setInput('playlists', [
      buildPlaylist({ id: 'p1', name: 'Loop One' }),
      buildPlaylist({ id: 'p2', name: 'Loop Two' }),
    ]);
    fixture.componentRef.setInput('playlistIds', ['p1', 'p2']);
    fixture.componentRef.setInput('defaultPlaylistId', 'p1');
    fixture.detectChanges();

    const badges = (fixture.nativeElement.textContent as string).match(/Default/g);
    expect(badges?.length).toBe(1);
  });

  it('renders no default badge when defaultPlaylistId is null', () => {
    fixture.componentRef.setInput('playlists', [buildPlaylist({ name: 'Loop One' })]);
    fixture.componentRef.setInput('playlistIds', ['p1']);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Default');
  });

  it('renders item count and formatted duration in the subtitle', () => {
    const playlist = buildPlaylist({
      items: [
        {
          id: 'i1',
          playlistId: 'p1',
          contentId: 'c1',
          position: 0,
          durationSeconds: 90,
          transition: 'fade',
          transitionDurationMs: 500,
        },
      ],
    });
    fixture.componentRef.setInput('playlists', [playlist]);
    fixture.componentRef.setInput('playlistIds', ['p1']);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('1 item');
    expect(text).toContain('1m 30s');
  });

  it('emits selectItem when the card is clicked', () => {
    const playlist = buildPlaylist({ id: 'p1' });
    fixture.componentRef.setInput('playlists', [playlist]);
    fixture.componentRef.setInput('playlistIds', ['p1']);
    fixture.detectChanges();

    const spy = vi.fn();
    component.selectItem.subscribe(spy);
    const card = fixture.debugElement.query(By.css('[role="button"]'));
    card.triggerEventHandler('click', new MouseEvent('click'));

    expect(spy).toHaveBeenCalledWith(playlist);
  });

  it('emits deletePlaylist from the trash button without opening', () => {
    const playlist = buildPlaylist({ id: 'p1' });
    fixture.componentRef.setInput('playlists', [playlist]);
    fixture.componentRef.setInput('playlistIds', ['p1']);
    fixture.detectChanges();

    const deleteSpy = vi.fn();
    const selectSpy = vi.fn();
    component.deletePlaylist.subscribe(deleteSpy);
    component.selectItem.subscribe(selectSpy);

    const trashBtn = fixture.debugElement.queryAll(By.css('button[aria-label^="Delete"]'))[0]
      .nativeElement as HTMLButtonElement;
    trashBtn.click();
    fixture.detectChanges();

    expect(deleteSpy).toHaveBeenCalledWith(playlist);
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('renders no dots/actions menu', () => {
    fixture.componentRef.setInput('playlists', [buildPlaylist({ id: 'p1' })]);
    fixture.componentRef.setInput('playlistIds', ['p1']);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('button[title="Actions"]')).length).toBe(0);
  });

  it('renders an empty grid when there are no playlists', () => {
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('mns-card')).length).toBe(0);
  });

  it('still tracks selection through the selection service', () => {
    fixture.componentRef.setInput('playlists', [buildPlaylist({ id: 'p1' })]);
    fixture.componentRef.setInput('playlistIds', ['p1']);
    selection.toggle('p1');
    fixture.detectChanges();

    expect(selection.selectedIds().has('p1')).toBe(true);
  });
});
