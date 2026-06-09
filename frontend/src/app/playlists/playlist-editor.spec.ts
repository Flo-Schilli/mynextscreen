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
    },
    ...overrides,
  };
}

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
    it('starts editing with the current name pre-filled', () => {
      fixture.componentRef.setInput('playlist', buildPlaylist({ name: 'Original' }));
      component.startEditName();

      expect(component['editingName']).toBe(true);
      expect(component['editNameValue']).toBe('Original');
    });

    it('emits rename with the trimmed name and exits edit mode on save', () => {
      const spy = vi.fn();
      component.rename.subscribe(spy);
      component.startEditName();
      component['editNameValue'] = '  New Name  ';

      component.saveName();

      expect(spy).toHaveBeenCalledWith('New Name');
      expect(component['editingName']).toBe(false);
    });

    it('does not emit rename when the trimmed name is empty', () => {
      const spy = vi.fn();
      component.rename.subscribe(spy);
      component.startEditName();
      component['editNameValue'] = '   ';

      component.saveName();

      expect(spy).not.toHaveBeenCalled();
      expect(component['editingName']).toBe(true);
    });

    it('exits edit mode without emitting on cancel', () => {
      const spy = vi.fn();
      component.rename.subscribe(spy);
      component.startEditName();

      component.cancelEditName();

      expect(component['editingName']).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    });

    it('shows the name heading and Rename button when not editing', () => {
      fixture.componentRef.setInput('playlist', buildPlaylist({ name: 'Heading Name' }));
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('h2')).nativeElement.textContent).toContain(
        'Heading Name',
      );
      expect(fixture.debugElement.query(By.css('.name-input'))).toBeNull();
    });

    it('shows the name input when editing', () => {
      component.startEditName();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.name-input'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('h2'))).toBeNull();
    });
  });

  describe('default-playlist controls', () => {
    it('shows the Set as Default button for org admins', () => {
      fixture.detectChanges();
      const buttons = fixture.debugElement
        .queryAll(By.css('.editor-actions button'))
        .map((b) => b.nativeElement.textContent.trim());
      expect(buttons.some((t: string) => t.includes('Set as Default'))).toBe(true);
    });

    it('hides the default button for non-admins', () => {
      fixture.componentRef.setInput('isOrgAdmin', false);
      fixture.detectChanges();
      const buttons = fixture.debugElement
        .queryAll(By.css('.editor-actions button'))
        .map((b) => b.nativeElement.textContent.trim());
      expect(buttons.some((t: string) => t.includes('Default'))).toBe(false);
    });

    it('labels the button "Default Playlist" when already default', () => {
      fixture.componentRef.setInput('isDefault', true);
      fixture.detectChanges();
      const labels = fixture.debugElement
        .queryAll(By.css('.editor-actions button'))
        .map((b) => b.nativeElement.textContent.trim());
      expect(labels.some((t: string) => t === 'Default Playlist')).toBe(true);
    });

    it('emits toggleDefault when the default button is clicked', () => {
      const spy = vi.fn();
      component.toggleDefault.subscribe(spy);
      fixture.detectChanges();

      const btn = fixture.debugElement
        .queryAll(By.css('.editor-actions button'))
        .find((b) => b.nativeElement.textContent.includes('Set as Default'));
      btn!.triggerEventHandler('click', undefined);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('header actions', () => {
    it('emits deletePlaylist and dismiss from the header buttons', () => {
      const del = vi.fn();
      const dismiss = vi.fn();
      component.deletePlaylist.subscribe(del);
      component.dismiss.subscribe(dismiss);
      fixture.detectChanges();

      fixture.debugElement.query(By.css('.btn-danger')).triggerEventHandler('click', undefined);
      const closeBtn = fixture.debugElement
        .queryAll(By.css('.editor-actions button'))
        .find((b) => b.nativeElement.textContent.trim() === 'Close');
      closeBtn!.triggerEventHandler('click', undefined);

      expect(del).toHaveBeenCalledTimes(1);
      expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it('renders the editor error when set', () => {
      fixture.componentRef.setInput('editorError', 'boom');
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
        'boom',
      );
    });
  });

  describe('items list', () => {
    it('shows the empty state when there are no items', () => {
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.empty-items'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('.item-list'))).toBeNull();
    });

    it('renders one row per item with the item list', () => {
      fixture.componentRef.setInput(
        'playlist',
        buildPlaylist({ items: [buildItem({ id: 'i1' }), buildItem({ id: 'i2' })] }),
      );
      fixture.detectChanges();

      expect(fixture.debugElement.queryAll(By.css('.item-row')).length).toBe(2);
    });

    it('emits addContent from the Add Content header button', () => {
      const spy = vi.fn();
      component.addContent.subscribe(spy);
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [buildItem()] }));
      fixture.detectChanges();

      fixture.debugElement
        .query(By.css('.items-header .btn-primary'))
        .triggerEventHandler('click', undefined);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits removeItem with the item when its remove button is clicked', () => {
      const item = buildItem({ id: 'rm' });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.removeItem.subscribe(spy);
      fixture.debugElement.query(By.css('.btn-remove')).triggerEventHandler('click', undefined);

      expect(spy).toHaveBeenCalledWith(item);
    });

    it('emits previewItem when a thumbnail is clicked', () => {
      const item = buildItem({ id: 'pv' });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.previewItem.subscribe(spy);
      fixture.debugElement.query(By.css('.item-thumbnail')).triggerEventHandler('click', undefined);

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
        .query(By.css('.item-list'))
        .triggerEventHandler('cdkDropListDropped', dropEvent);

      expect(spy).toHaveBeenCalledWith(dropEvent);
    });

    it('renders the total duration', () => {
      fixture.componentRef.setInput(
        'playlist',
        buildPlaylist({ items: [buildItem({ durationSeconds: 65 })] }),
      );
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('.total-duration')).nativeElement.textContent,
      ).toContain('1m 5s');
    });

    it('disables the duration input for video items', async () => {
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
              },
            }),
          ],
        }),
      );
      fixture.detectChanges();
      for (let i = 0; i < 6; i++) await Promise.resolve();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.duration-input')).nativeElement.disabled).toBe(
        true,
      );
    });

    it('renders an image thumbnail using thumbUrl for image items', () => {
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [buildItem()] }));
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('.thumb-img')).nativeElement.getAttribute('src'),
      ).toBe('/thumb/c1');
    });

    it('renders a video placeholder for video items', () => {
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
              },
            }),
          ],
        }),
      );
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.thumb-video'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('.thumb-img'))).toBeNull();
    });
  });

  describe('per-item field changes', () => {
    it('emits durationChange when the duration model changes', () => {
      const item = buildItem({ id: 'i1' });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.durationChange.subscribe(spy);
      fixture.debugElement
        .query(By.css('.duration-input'))
        .triggerEventHandler('ngModelChange', 25);

      expect(spy).toHaveBeenCalledWith({ item, value: 25 });
    });

    it('emits transitionChange when the transition select changes', () => {
      const item = buildItem({ id: 'i1' });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.transitionChange.subscribe(spy);
      fixture.debugElement
        .query(By.css('.transition-select'))
        .triggerEventHandler('ngModelChange', 'zoom-in');

      expect(spy).toHaveBeenCalledWith({ item, value: 'zoom-in' });
    });

    it('emits transitionDurationChange when the trans-ms model changes', () => {
      const item = buildItem({ id: 'i1' });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();

      const spy = vi.fn();
      component.transitionDurationChange.subscribe(spy);
      const tdur = fixture.debugElement.queryAll(By.css('.duration-input'))[1];
      tdur.triggerEventHandler('ngModelChange', 800);

      expect(spy).toHaveBeenCalledWith({ item, value: 800 });
    });
  });

  describe('inline preview', () => {
    it('does not render the preview section when no item is previewing', () => {
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.preview-section'))).toBeNull();
    });

    it('renders an image preview for an image item', () => {
      const item = buildItem({ id: 'pv' });
      fixture.componentRef.setInput('previewingItem', item);
      fixture.detectChanges();

      const media = fixture.debugElement.query(By.css('img.preview-media'));
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
        },
      });
      fixture.componentRef.setInput('previewingItem', item);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('video.preview-media'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('img.preview-media'))).toBeNull();
    });

    it('emits closePreview when Close Preview is clicked', () => {
      fixture.componentRef.setInput('previewingItem', buildItem());
      fixture.detectChanges();

      const spy = vi.fn();
      component.closePreview.subscribe(spy);
      fixture.debugElement
        .query(By.css('.preview-header .btn-secondary'))
        .triggerEventHandler('click', undefined);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
