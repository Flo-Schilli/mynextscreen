import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { PlaylistEditor } from './playlist-editor';
import { Playlist, PlaylistItem } from './playlist.model';

function buildItem(overrides: Partial<PlaylistItem> = {}): PlaylistItem {
  return {
    id: 'i1',
    playlistId: 'p1',
    contentId: 'c1',
    position: 0,
    durationSeconds: 10,
    transition: 'fade',
    transitionDurationMs: 500,
    content: {
      id: 'c1',
      title: 'Clip',
      type: 'image',
      originalFilename: 'clip.png',
      transcodingStatus: 'completed',
      durationSeconds: null,
      thumbnailSizeBytes: null,
    },
    ...overrides,
  };
}

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

describe('PlaylistEditor', () => {
  let fixture: ComponentFixture<PlaylistEditor>;
  let component: PlaylistEditor;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaylistEditor],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaylistEditor);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('playlist', buildPlaylist());
    fixture.componentRef.setInput('isOrgAdmin', true);
    fixture.componentRef.setInput('isDefault', false);
    fixture.componentRef.setInput('settingDefault', false);
    fixture.componentRef.setInput('editorError', '');
    fixture.componentRef.setInput('previewingItem', null);
    fixture.componentRef.setInput('thumbUrl', (i: PlaylistItem) => `/thumb/${i.contentId}`);
    fixture.componentRef.setInput('previewUrl', (i: PlaylistItem) => `/preview/${i.contentId}`);
  });

  describe('inline rename', () => {
    function nameInput(): HTMLInputElement {
      return fixture.debugElement.query(By.css('input[type="text"]')).nativeElement;
    }

    it('shows the current name in the rename input', () => {
      fixture.componentRef.setInput('playlist', buildPlaylist({ name: 'Heading Name' }));
      fixture.detectChanges();

      expect(nameInput().value).toBe('Heading Name');
    });

    it('emits rename with the trimmed name on blur', () => {
      fixture.detectChanges();
      const spy = vi.fn();
      component.rename.subscribe(spy);

      component['commitName']('  New Name  ');

      expect(spy).toHaveBeenCalledWith('New Name');
    });

    it('does not emit rename when the name is unchanged', () => {
      fixture.detectChanges();
      const spy = vi.fn();
      component.rename.subscribe(spy);

      component['commitName']('Lobby Loop');

      expect(spy).not.toHaveBeenCalled();
    });

    it('does not emit rename when the trimmed name is empty', () => {
      fixture.detectChanges();
      const spy = vi.fn();
      component.rename.subscribe(spy);

      component['commitName']('   ');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('accent colour', () => {
    it('emits colorChange when a swatch is clicked', () => {
      fixture.detectChanges();
      const spy = vi.fn();
      component.colorChange.subscribe(spy);

      const swatch = fixture.debugElement.query(
        By.css('button[aria-label="Set accent colour #ec4899"]'),
      );
      swatch.triggerEventHandler('click', new MouseEvent('click'));

      expect(spy).toHaveBeenCalledWith('#ec4899');
    });
  });

  describe('default-playlist controls', () => {
    it('shows the Set as default button for org admins', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Set as default');
    });

    it('hides the default button for non-admins', () => {
      fixture.componentRef.setInput('isOrgAdmin', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Set as default');
    });

    // The label is the only thing that tells an operator the default can be
    // taken off again; "Default playlist" read as a status badge, and the grid
    // already carries that badge.
    it('offers to remove the default when it is already the default', () => {
      fixture.componentRef.setInput('isDefault', true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Remove as default');
    });

    it('emits toggleDefault when the default button is clicked', () => {
      const spy = vi.fn();
      component.toggleDefault.subscribe(spy);
      fixture.detectChanges();

      const btn = fixture.debugElement
        .queryAll(By.css('mns-btn'))
        .find((b) => b.nativeElement.textContent.includes('Set as default'));
      btn!.triggerEventHandler('mnsClick', new MouseEvent('click'));

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('header actions', () => {
    it('emits deletePlaylist from the Delete button', () => {
      const del = vi.fn();
      component.deletePlaylist.subscribe(del);
      fixture.detectChanges();

      const deleteBtn = fixture.debugElement
        .queryAll(By.css('mns-btn'))
        .find((b) => b.nativeElement.textContent.trim() === 'Delete');
      deleteBtn!.triggerEventHandler('mnsClick', new MouseEvent('click'));

      expect(del).toHaveBeenCalledTimes(1);
    });

    it('emits dismiss from the back button', () => {
      const dismiss = vi.fn();
      component.dismiss.subscribe(dismiss);
      fixture.detectChanges();

      fixture.debugElement
        .query(By.css('button'))
        .triggerEventHandler('click', new MouseEvent('click'));

      expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it('renders the editor error when set', () => {
      fixture.componentRef.setInput('editorError', 'boom');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('boom');
    });
  });

  describe('items list', () => {
    it('shows the empty state when there are no items', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No items yet');
      expect(fixture.debugElement.query(By.css('.item-row'))).toBeNull();
    });

    it('renders one row per item', () => {
      fixture.componentRef.setInput(
        'playlist',
        buildPlaylist({ items: [buildItem({ id: 'i1' }), buildItem({ id: 'i2' })] }),
      );
      fixture.detectChanges();

      expect(fixture.debugElement.queryAll(By.css('.item-row')).length).toBe(2);
    });

    it('emits addContent from the Add content header button', () => {
      const spy = vi.fn();
      component.addContent.subscribe(spy);
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [buildItem()] }));
      fixture.detectChanges();

      const addBtn = fixture.debugElement
        .queryAll(By.css('mns-btn'))
        .find((b) => b.nativeElement.textContent.includes('Add content'));
      addBtn!.triggerEventHandler('mnsClick', new MouseEvent('click'));

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits removeItem with the item when its remove button is clicked', () => {
      const item = buildItem({ id: 'rm' });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.removeItem.subscribe(spy);
      fixture.debugElement
        .query(By.css('button[title="Remove from playlist"]'))
        .triggerEventHandler('click', new MouseEvent('click'));

      expect(spy).toHaveBeenCalledWith(item);
    });

    it('emits previewItem when a thumbnail is clicked', () => {
      const item = buildItem({ id: 'pv' });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.previewItem.subscribe(spy);
      fixture.debugElement
        .query(By.css('button[aria-label="Preview item"]'))
        .triggerEventHandler('click', new MouseEvent('click'));

      expect(spy).toHaveBeenCalledWith(item);
    });

    it('emits reorder with the drag event on drop', () => {
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [buildItem()] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.reorder.subscribe(spy);
      const dropEvent = {
        previousIndex: 1,
        currentIndex: 0,
      } as CdkDragDrop<PlaylistItem[]>;
      fixture.debugElement
        .query(By.css('[cdkDropList]'))
        .triggerEventHandler('cdkDropListDropped', dropEvent);

      expect(spy).toHaveBeenCalledWith(dropEvent);
    });

    it('renders the total duration in a header badge', () => {
      fixture.componentRef.setInput(
        'playlist',
        buildPlaylist({ items: [buildItem({ durationSeconds: 65 })] }),
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('1m 5s');
    });

    it('renders a fixed clock pill for video items instead of a stepper', () => {
      fixture.componentRef.setInput(
        'playlist',
        buildPlaylist({
          items: [
            buildItem({
              content: {
                id: 'c1',
                title: 'Movie',
                type: 'video',
                originalFilename: 'm.mp4',
                transcodingStatus: 'completed',
                durationSeconds: 42,
                thumbnailSizeBytes: null,
              },
            }),
          ],
        }),
      );
      fixture.detectChanges();

      // Video shows its content length; no decrease-duration button for videos.
      expect(fixture.nativeElement.textContent).toContain('42s');
      const decBtns = fixture.debugElement.queryAll(
        By.css('button[aria-label="Decrease duration"]'),
      );
      expect(decBtns.length).toBe(0);
    });

    it('renders an image thumbnail using thumbUrl for image items', () => {
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [buildItem()] }));
      fixture.detectChanges();

      const img = fixture.debugElement.query(By.css('.item-row img'));
      expect(img.nativeElement.getAttribute('src')).toBe('/thumb/c1');
    });
  });

  describe('per-item field changes', () => {
    it('emits durationChange when the image duration stepper increments', () => {
      const item = buildItem({ id: 'i1', durationSeconds: 10 });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.durationChange.subscribe(spy);
      fixture.debugElement
        .query(By.css('button[aria-label="Increase duration"]'))
        .triggerEventHandler('click', new MouseEvent('click'));

      expect(spy).toHaveBeenCalledWith({ item, value: 11 });
    });

    it('emits transitionChange when the transition select changes', () => {
      const item = buildItem({ id: 'i1' });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.transitionChange.subscribe(spy);
      fixture.debugElement.query(By.css('mns-select')).triggerEventHandler('changed', 'zoom-in');

      expect(spy).toHaveBeenCalledWith({ item, value: 'zoom-in' });
    });

    it('emits transitionDurationChange when the trans-ms stepper increments', () => {
      const item = buildItem({ id: 'i1', transitionDurationMs: 500 });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.transitionDurationChange.subscribe(spy);
      fixture.debugElement
        .query(By.css('button[aria-label="Increase transition ms"]'))
        .triggerEventHandler('click', new MouseEvent('click'));

      expect(spy).toHaveBeenCalledWith({ item, value: 600 });
    });
  });

  describe('inline preview', () => {
    it('does not render the preview card when no item is previewing', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Preview:');
    });

    it('renders an image preview for an image item', () => {
      const item = buildItem({ id: 'pv' });
      fixture.componentRef.setInput('previewingItem', item);
      fixture.detectChanges();

      const media = fixture.debugElement.query(By.css('img[alt="Preview"]'));
      expect(media).not.toBeNull();
      expect(media.nativeElement.getAttribute('src')).toBe('/preview/c1');
    });

    it('renders a video preview for a video item', () => {
      const item = buildItem({
        id: 'pv',
        content: {
          id: 'c1',
          title: 'Movie',
          type: 'video',
          originalFilename: 'm.mp4',
          transcodingStatus: 'completed',
          durationSeconds: 42,
          thumbnailSizeBytes: null,
        },
      });
      fixture.componentRef.setInput('previewingItem', item);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('video'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('img[alt="Preview"]'))).toBeNull();
    });

    it('emits closePreview when Close is clicked', () => {
      fixture.componentRef.setInput('previewingItem', buildItem());
      fixture.detectChanges();

      const spy = vi.fn();
      component.closePreview.subscribe(spy);
      const closeBtn = fixture.debugElement
        .queryAll(By.css('mns-btn'))
        .find((b) => b.nativeElement.textContent.trim() === 'Close');
      closeBtn!.triggerEventHandler('mnsClick', new MouseEvent('click'));

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
