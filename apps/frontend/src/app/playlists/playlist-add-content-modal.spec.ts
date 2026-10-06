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

  it('emits selectContent with the picked content', () => {
    const picked = buildContent({ id: 'pick' });
    fixture.componentRef.setInput('availableContent', [picked]);
    fixture.detectChanges();

    const spy = vi.fn();
    component.selectContent.subscribe(spy);
    const row = fixture.debugElement
      .queryAll(By.css('button'))
      .find((b) => (b.nativeElement.textContent as string).includes('Clip'));
    row!.triggerEventHandler('click', new MouseEvent('click'));

    expect(spy).toHaveBeenCalledWith(picked);
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
