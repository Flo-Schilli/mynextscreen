import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PlaylistGrid } from './playlist-grid';
import { Playlist } from './playlist.model';
import { SelectionService } from '../shared/selection/selection.service';
import { BulkAction } from '../shared/selection/bulk-action-toolbar';

function buildPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'p1',
    organisationId: 'org1',
    name: 'Lobby Loop',
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaylistGrid],
      providers: [provideZonelessChangeDetection(), SelectionService],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaylistGrid);
    component = fixture.componentInstance;
    selection = TestBed.inject(SelectionService);
    fixture.componentRef.setInput('playlists', []);
    fixture.componentRef.setInput('playlistIds', []);
    fixture.componentRef.setInput('defaultPlaylistId', null);
    fixture.componentRef.setInput('bulkActions', actions);
  });

  it('renders one card per playlist', () => {
    fixture.componentRef.setInput('playlists', [
      buildPlaylist({ id: 'p1' }),
      buildPlaylist({ id: 'p2' }),
    ]);
    fixture.componentRef.setInput('playlistIds', ['p1', 'p2']);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.playlist-card')).length).toBe(2);
  });

  it('shows the default badge only on the default playlist', () => {
    fixture.componentRef.setInput('playlists', [
      buildPlaylist({ id: 'p1', name: 'Default One' }),
      buildPlaylist({ id: 'p2', name: 'Other' }),
    ]);
    fixture.componentRef.setInput('playlistIds', ['p1', 'p2']);
    fixture.componentRef.setInput('defaultPlaylistId', 'p1');
    fixture.detectChanges();

    const badges = fixture.debugElement.queryAll(By.css('.default-badge'));
    expect(badges.length).toBe(1);
    expect(badges[0].nativeElement.textContent).toContain('Default');
  });

  it('renders no default badge when defaultPlaylistId is null', () => {
    fixture.componentRef.setInput('playlists', [buildPlaylist()]);
    fixture.componentRef.setInput('playlistIds', ['p1']);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.default-badge'))).toBeNull();
  });

  it('renders item count and formatted duration', () => {
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

    const values = fixture.debugElement.queryAll(By.css('.card-value'));
    expect(values[0].nativeElement.textContent).toContain('1');
    expect(values[1].nativeElement.textContent).toContain('1m 30s');
  });

  it('applies the selected class to a card when its id is selected', () => {
    fixture.componentRef.setInput('playlists', [buildPlaylist({ id: 'p1' })]);
    fixture.componentRef.setInput('playlistIds', ['p1']);
    selection.toggle('p1');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.playlist-card')).nativeElement.classList).toContain(
      'selected',
    );
  });

  it('emits selectItem when a card is clicked', () => {
    const playlist = buildPlaylist({ id: 'p1' });
    fixture.componentRef.setInput('playlists', [playlist]);
    fixture.componentRef.setInput('playlistIds', ['p1']);
    fixture.detectChanges();

    const spy = vi.fn();
    component.selectItem.subscribe(spy);
    fixture.debugElement.query(By.css('.playlist-card')).triggerEventHandler('click', undefined);

    expect(spy).toHaveBeenCalledWith(playlist);
  });

  it('renders an empty grid when there are no playlists', () => {
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.playlist-card')).length).toBe(0);
  });
});
