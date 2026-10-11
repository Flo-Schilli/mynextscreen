import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PlaylistAddContentModal } from './playlist-add-content-modal';
import { Content } from '../content/content.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

function buildContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'c1',
    organisationId: 'org1',
    title: 'Clip',
    description: null,
    tags: [],
    type: 'image',
    originalFilename: 'clip.png',
    originalMimeType: 'image/png',
    originalSizeBytes: 100,
    transcodedSizeBytes: 50,
    thumbnailSizeBytes: null,
    transcodingStatus: 'completed',
    transcodingError: null,
    durationSeconds: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('PlaylistAddContentModal', () => {
  let fixture: ComponentFixture<PlaylistAddContentModal>;
  let component: PlaylistAddContentModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PlaylistAddContentModal,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaylistAddContentModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('availableContent', []);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('thumbUrl', (c: Content) => `/thumb/${c.id}`);
  });

  it('shows a loading message while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading content library');
  });

  it('shows the empty message when no content is available', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No content available');
  });

  it('renders a list row per content item when content is available', () => {
    fixture.componentRef.setInput('availableContent', [buildContent()]);
    fixture.detectChanges();

    expect(
      fixture.debugElement.queryAll(By.css('mns-modal button img, mns-modal button')).length,
    ).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain('Clip');
  });

  describe('filteredContent', () => {
    it('excludes content that is not transcoded yet', () => {
      fixture.componentRef.setInput('availableContent', [
        buildContent({ id: 'a', transcodingStatus: 'completed' }),
        buildContent({ id: 'b', transcodingStatus: 'processing' }),
      ]);
      fixture.detectChanges();

      expect(component['filteredContent']().map((c) => c.id)).toEqual(['a']);
    });

    it('filters to images only when the image filter is active', () => {
      fixture.componentRef.setInput('availableContent', [
        buildContent({ id: 'img', type: 'image' }),
        buildContent({ id: 'vid', type: 'video' }),
      ]);
      fixture.detectChanges();

      component['filter'].set('image');
      fixture.detectChanges();

      expect(component['filteredContent']().map((c) => c.id)).toEqual(['img']);
    });

    it('filters to videos only when the video filter is active', () => {
      fixture.componentRef.setInput('availableContent', [
        buildContent({ id: 'img', type: 'image' }),
        buildContent({ id: 'vid', type: 'video' }),
      ]);
      fixture.detectChanges();

      component['filter'].set('video');
      fixture.detectChanges();

      expect(component['filteredContent']().map((c) => c.id)).toEqual(['vid']);
    });

    it('returns all transcoded content when the filter is undefined', () => {
      fixture.componentRef.setInput('availableContent', [
        buildContent({ id: 'img', type: 'image' }),
        buildContent({ id: 'vid', type: 'video' }),
      ]);
      fixture.detectChanges();

      expect(component['filteredContent']().map((c) => c.id)).toEqual(['img', 'vid']);
    });

    it('filters by the search query', () => {
      fixture.componentRef.setInput('availableContent', [
        buildContent({ id: 'a', title: 'Sunset' }),
        buildContent({ id: 'b', title: 'Mountain' }),
      ]);
      fixture.detectChanges();

      component['query'].set('moun');
      fixture.detectChanges();

      expect(component['filteredContent']().map((c) => c.id)).toEqual(['b']);
    });
  });

  it('sets the filter when a type toggle is clicked', () => {
    fixture.componentRef.setInput('availableContent', [buildContent()]);
    fixture.detectChanges();

    const imagesBtn = fixture.debugElement
      .queryAll(By.css('mns-btn'))
      .find((b) => b.nativeElement.textContent.trim() === 'Images');
    imagesBtn!.triggerEventHandler('mnsClick', new MouseEvent('click'));

    expect(component['filter']()).toBe('image');
  });

  it('renders an img thumbnail for image content using thumbUrl', () => {
    fixture.componentRef.setInput('availableContent', [buildContent({ id: 'c9', type: 'image' })]);
    fixture.detectChanges();

    const img = fixture.debugElement.query(By.css('img'));
    expect(img.nativeElement.getAttribute('src')).toBe('/thumb/c9');
  });

  describe('ordered multi-selection', () => {
    function row(id: string) {
      return fixture.debugElement.query(By.css(`button[data-content-id="${id}"]`));
    }

    function click(id: string): void {
      row(id).triggerEventHandler('click', new MouseEvent('click'));
      fixture.detectChanges();
    }

    function badge(id: string): string | null {
      const el = row(id).query(By.css('.selection-badge'));
      return el ? (el.nativeElement.textContent as string).trim() : null;
    }

    function addButton() {
      return fixture.debugElement
        .queryAll(By.css('mns-btn'))
        .find((b) => (b.nativeElement.textContent as string).includes('Add'))!;
    }

    beforeEach(() => {
      fixture.componentRef.setInput('availableContent', [
        buildContent({ id: 'a', title: 'A' }),
        buildContent({ id: 'b', title: 'B', type: 'video' }),
        buildContent({ id: 'c', title: 'C' }),
      ]);
      fixture.detectChanges();
    });

    it('numbers rows in click order', () => {
      click('b');
      click('a');
      click('c');

      expect([badge('a'), badge('b'), badge('c')]).toEqual(['2', '1', '3']);
      expect(row('b').nativeElement.getAttribute('aria-pressed')).toBe('true');
    });

    it('emits the selection in click order', () => {
      const spy = vi.fn();
      component.addSelected.subscribe(spy);
      click('b');
      click('a');
      click('c');

      addButton().triggerEventHandler('mnsClick', new MouseEvent('click'));

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].map((c: Content) => c.id)).toEqual(['b', 'a', 'c']);
    });

    it('renumbers the remaining rows when one is deselected', () => {
      click('b');
      click('a');
      click('c');
      click('b');

      expect([badge('a'), badge('b'), badge('c')]).toEqual(['1', null, '2']);
    });

    it('keeps the selection across filter and search changes', () => {
      click('c');
      component['filter'].set('video');
      component['query'].set('B');
      fixture.detectChanges();
      click('b');
      component['filter'].set(undefined);
      component['query'].set('');
      fixture.detectChanges();

      expect([badge('a'), badge('b'), badge('c')]).toEqual([null, '2', '1']);
    });

    it('disables the add button until something is selected', () => {
      expect(addButton().componentInstance.disabled()).toBe(true);
      click('a');
      expect(addButton().componentInstance.disabled()).toBe(false);
    });

    it('clears the selection', () => {
      click('a');
      const clear = fixture.debugElement
        .queryAll(By.css('mns-btn'))
        .find((b) => (b.nativeElement.textContent as string).includes('Clear selection'))!;
      clear.triggerEventHandler('mnsClick', new MouseEvent('click'));
      fixture.detectChanges();

      expect(badge('a')).toBeNull();
    });
  });

  it('sorts content naturally by title', () => {
    fixture.componentRef.setInput('availableContent', [
      buildContent({ id: 'x10', title: 'Bild 10' }),
      buildContent({ id: 'x2', title: 'bild 2' }),
      buildContent({ id: 'x1', title: 'Bild 1' }),
    ]);
    fixture.detectChanges();

    const ids = fixture.debugElement
      .queryAll(By.css('button[data-content-id]'))
      .map((b) => b.nativeElement.getAttribute('data-content-id'));
    expect(ids).toEqual(['x1', 'x2', 'x10']);
  });

  it('emits dismiss when Close is clicked', () => {
    fixture.detectChanges();

    const spy = vi.fn();
    component.dismiss.subscribe(spy);
    const closeBtn = fixture.debugElement
      .queryAll(By.css('mns-btn'))
      .find((b) => b.nativeElement.textContent.trim() === 'Close');
    closeBtn!.triggerEventHandler('mnsClick', new MouseEvent('click'));

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
