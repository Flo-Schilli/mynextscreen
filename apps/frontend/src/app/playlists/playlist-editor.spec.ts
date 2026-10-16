import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { PlaylistEditor } from './playlist-editor';
import { Playlist, PlaylistItem } from './playlist.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';
import { of } from 'rxjs';
import { PlaylistService } from './playlist.service';
import { ContentSourceService } from '../sources/content-source.service';
import { ContentService } from '../content/content.service';

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
      imports: [
        PlaylistEditor,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        // Only the rule editor of a dynamic playlist talks to these.
        {
          provide: ContentSourceService,
          useValue: { getAll: () => of([]), getFacets: () => of({ venues: [], genres: [] }) },
        },
        {
          provide: PlaylistService,
          useValue: { previewRule: () => of({ items: [], totalDurationSeconds: 0 }) },
        },
        {
          provide: ContentService,
          useValue: { getThumbnailUrl: () => '', getTranscodedUrl: () => '' },
        },
      ],
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

  describe('typed duration', () => {
    let item: PlaylistItem;
    let spy: ReturnType<typeof vi.fn<(value: unknown) => void>>;

    function field(): HTMLInputElement {
      return fixture.debugElement.query(By.css('input.duration-input')).nativeElement;
    }

    function type(value: string, event: 'blur' | 'enter' | 'escape' = 'blur'): void {
      const input = fixture.debugElement.query(By.css('input.duration-input'));
      input.nativeElement.value = value;
      if (event === 'blur') {
        input.triggerEventHandler('blur', new FocusEvent('blur'));
      } else {
        input.nativeElement.dispatchEvent(
          new KeyboardEvent('keydown', { key: event === 'enter' ? 'Enter' : 'Escape' }),
        );
        input.triggerEventHandler('blur', new FocusEvent('blur'));
      }
    }

    beforeEach(() => {
      item = buildItem({ id: 'i1', durationSeconds: 10 });
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [item] }));
      fixture.detectChanges();
      spy = vi.fn();
      component.durationChange.subscribe(spy);
    });

    it('shows the current duration', () => {
      expect(field().value).toBe('10');
    });

    it('emits durationChange with the typed value on blur', () => {
      type('45');
      expect(spy).toHaveBeenCalledWith({ item, value: 45 });
    });

    it('emits on Enter', () => {
      type('120', 'enter');
      expect(spy).toHaveBeenCalledWith({ item, value: 120 });
    });

    it('rounds a decimal entry', () => {
      type('7.6');
      expect(spy).toHaveBeenCalledWith({ item, value: 8 });
      expect(field().value).toBe('8');
    });

    it.each(['0', '-3', '', 'abc'])('snaps back to the saved value for "%s"', (raw) => {
      type(raw);
      expect(spy).not.toHaveBeenCalled();
      expect(field().value).toBe('10');
    });

    it('does not emit when the value is unchanged', () => {
      type('10');
      expect(spy).not.toHaveBeenCalled();
    });

    it('discards the entry on Escape', () => {
      type('99', 'escape');
      expect(spy).not.toHaveBeenCalled();
      expect(field().value).toBe('10');
    });
  });

  describe('apply to all items', () => {
    const video = (id: string): PlaylistItem =>
      buildItem({
        id,
        durationSeconds: 42,
        content: {
          id: 'v1',
          title: 'Movie',
          type: 'video',
          originalFilename: 'm.mp4',
          transcodingStatus: 'completed',
          durationSeconds: 42,
          thumbnailSizeBytes: null,
        },
      });

    function bar() {
      return fixture.debugElement.query(By.css('.apply-all'));
    }

    function setInputValue(selector: string, value: string): void {
      const input = fixture.debugElement.query(By.css(selector));
      input.nativeElement.value = value;
      input.triggerEventHandler('input', new Event('input'));
      fixture.detectChanges();
    }

    function clickApply(selector: string): void {
      fixture.debugElement
        .query(By.css(selector))
        .triggerEventHandler('mnsClick', new MouseEvent('click'));
    }

    it('is hidden for a playlist with a single item', () => {
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [buildItem()] }));
      fixture.detectChanges();
      expect(bar()).toBeNull();
    });

    describe('with several items', () => {
      let spy: ReturnType<typeof vi.fn<(value: unknown) => void>>;

      beforeEach(() => {
        fixture.componentRef.setInput(
          'playlist',
          buildPlaylist({
            items: [
              video('i0'),
              buildItem({ id: 'i1', durationSeconds: 15, transitionDurationMs: 800 }),
            ],
          }),
        );
        fixture.detectChanges();
        spy = vi.fn();
        component.applyToAll.subscribe(spy);
      });

      it('seeds the duration from the first image', () => {
        expect(bar().query(By.css('input.apply-all-duration')).nativeElement.value).toBe('15');
      });

      it('emits only the duration', () => {
        setInputValue('input.apply-all-duration', '20');
        clickApply('.apply-all-duration-btn');
        expect(spy).toHaveBeenCalledWith({ durationSeconds: 20 });
      });

      it('disables the duration apply for an invalid entry', () => {
        setInputValue('input.apply-all-duration', '0');
        expect(
          fixture.debugElement
            .query(By.css('.apply-all-duration-btn'))
            .componentInstance.disabled(),
        ).toBe(true);
      });

      it('emits only the transition', () => {
        bar().query(By.css('mns-select')).triggerEventHandler('changed', 'zoom-in');
        fixture.detectChanges();
        clickApply('.apply-all-transition-btn');
        expect(spy).toHaveBeenCalledWith({ transition: 'zoom-in' });
      });

      it('emits only the transition duration within 0–3000 ms', () => {
        setInputValue('input.apply-all-transition-ms', '1200');
        clickApply('.apply-all-transition-ms-btn');
        expect(spy).toHaveBeenCalledWith({ transitionDurationMs: 1200 });

        setInputValue('input.apply-all-transition-ms', '3500');
        expect(
          fixture.debugElement
            .query(By.css('.apply-all-transition-ms-btn'))
            .componentInstance.disabled(),
        ).toBe(true);
      });
    });

    it('disables the duration control when the playlist holds no images', () => {
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [video('a'), video('b')] }));
      fixture.detectChanges();
      expect(bar().query(By.css('input.apply-all-duration')).nativeElement.disabled).toBe(true);
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

  describe('dynamic playlist', () => {
    const dynamic = (): Playlist =>
      buildPlaylist({
        kind: 'dynamic',
        items: [buildItem()],
        rule: {
          sourceIds: ['s1'],
          genres: { match: 'any', values: [] },
          venues: [],
          dateFrom: { mode: 'today' },
          dateTo: { mode: 'none' },
          excludeCancelled: true,
          excludeSoldOut: false,
          sort: 'date_asc',
          limit: 50,
          graceHours: 4,
          refreshIntervalMinutes: 15,
          format: '1920x1080',
          itemDurationSeconds: 10,
          transition: 'fade',
          transitionDurationMs: 500,
        },
      });

    it('shows the rule editor instead of the hand-sorted sequence', () => {
      fixture.componentRef.setInput('playlist', dynamic());
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-playlist-rule-editor')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[cdkDropList]')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Add content');
      expect(fixture.nativeElement.textContent).toContain('Dynamic');
    });

    it('keeps the sequence for a static playlist', () => {
      fixture.componentRef.setInput('playlist', buildPlaylist({ items: [buildItem()] }));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-playlist-rule-editor')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Add content');
    });
  });
});
