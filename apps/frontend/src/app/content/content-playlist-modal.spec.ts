import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentPlaylistModal } from './content-playlist-modal';
import { Playlist } from '../playlists/playlist.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const flush = async (f: ComponentFixture<unknown>): Promise<void> => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
  await f.whenStable();
  f.detectChanges();
};

function makePlaylist(id: string, name: string): Playlist {
  return {
    id,
    organisationId: 'org1',
    name,
    items: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('ContentPlaylistModal', () => {
  let fixture: ComponentFixture<ContentPlaylistModal>;

  function setUp(
    opts: {
      playlists?: Playlist[];
      loading?: boolean;
      loadError?: string;
      selectedId?: string;
    } = {},
  ): void {
    fixture = TestBed.createComponent(ContentPlaylistModal);
    fixture.componentRef.setInput('playlists', opts.playlists ?? []);
    fixture.componentRef.setInput('loading', opts.loading ?? false);
    fixture.componentRef.setInput('loadError', opts.loadError ?? '');
    fixture.componentRef.setInput('selectedId', opts.selectedId ?? '');
    fixture.detectChanges();
  }

  function footerBtns(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[slot="footer"] button'));
  }

  function confirmBtn(): HTMLButtonElement {
    // The confirm button is the second (primary) footer button.
    return footerBtns()[1];
  }

  function cancelBtn(): HTMLButtonElement {
    return footerBtns()[0];
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('shows a loading message while playlists are loading', () => {
    // Arrange / Act
    setUp({ loading: true });

    // Assert
    expect(fixture.nativeElement.textContent).toContain('Loading playlists...');
    expect(fixture.nativeElement.querySelector('.playlist-list')).toBeNull();
  });

  it('shows the load error when loading failed', () => {
    // Arrange / Act
    setUp({ loadError: 'Failed to load playlists.' });

    // Assert
    const error: HTMLElement = fixture.nativeElement.querySelector('.error');
    expect(error.textContent).toContain('Failed to load playlists.');
    expect(fixture.nativeElement.querySelector('.playlist-list')).toBeNull();
  });

  it('renders a radio option per playlist when loaded', () => {
    // Arrange / Act
    setUp({ playlists: [makePlaylist('p1', 'Lobby'), makePlaylist('p2', 'Bar')] });

    // Assert
    const options = fixture.nativeElement.querySelectorAll('.playlist-option');
    expect(options.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Lobby');
    expect(fixture.nativeElement.textContent).toContain('Bar');
  });

  it('shows an empty notice when loaded with no playlists', () => {
    // Arrange / Act
    setUp({ playlists: [] });

    // Assert
    expect(fixture.nativeElement.querySelector('.empty-text').textContent).toContain(
      'No playlists available.',
    );
  });

  it('disables confirm when no playlist is selected', () => {
    // Arrange / Act
    setUp({ playlists: [makePlaylist('p1', 'Lobby')], selectedId: '' });

    // Assert
    expect(confirmBtn().disabled).toBe(true);
  });

  it('disables confirm while loading even if an id is selected', () => {
    // Arrange / Act
    setUp({ loading: true, selectedId: 'p1' });

    // Assert
    expect(confirmBtn().disabled).toBe(true);
  });

  it('enables confirm once a playlist is selected and loading is done', () => {
    // Arrange / Act
    setUp({ playlists: [makePlaylist('p1', 'Lobby')], selectedId: 'p1' });

    // Assert
    expect(confirmBtn().disabled).toBe(false);
  });

  it('emits confirm when the enabled confirm button is clicked', () => {
    // Arrange
    setUp({ playlists: [makePlaylist('p1', 'Lobby')], selectedId: 'p1' });
    const spy = vi.fn();
    fixture.componentInstance.confirm.subscribe(spy);

    // Act
    confirmBtn().click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when Cancel is clicked', () => {
    // Arrange
    setUp({ playlists: [makePlaylist('p1', 'Lobby')] });
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    // Act
    cancelBtn().click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('updates the selectedId model when a radio option is chosen', async () => {
    // Arrange
    setUp({ playlists: [makePlaylist('p1', 'Lobby'), makePlaylist('p2', 'Bar')] });
    const radios: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="radio"]'),
    );

    // Act: pick the second playlist
    radios[1].click();
    await flush(fixture);

    // Assert
    expect(fixture.componentInstance.selectedId()).toBe('p2');
  });
});
