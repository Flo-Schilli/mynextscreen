import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PlaylistAddContentModal } from './playlist-add-content-modal';
import { Content } from '../content/content.model';

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
      imports: [PlaylistAddContentModal],
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

    expect(fixture.debugElement.query(By.css('.loading-text'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.content-grid'))).toBeNull();
  });

  it('shows the empty message when no content is available', () => {
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.empty-text'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.content-grid'))).toBeNull();
  });

  it('renders the content grid when content is available', () => {
    fixture.componentRef.setInput('availableContent', [buildContent()]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.content-grid'))).not.toBeNull();
    expect(fixture.debugElement.queryAll(By.css('.content-item')).length).toBe(1);
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
  });

  it('marks the All toggle active by default', () => {
    fixture.componentRef.setInput('availableContent', [buildContent()]);
    fixture.detectChanges();

    const toggles = fixture.debugElement.queryAll(By.css('.toggle-btn'));
    expect(toggles[0].nativeElement.classList).toContain('active');
  });

  it('sets the filter when a type toggle is clicked', () => {
    fixture.componentRef.setInput('availableContent', [buildContent()]);
    fixture.detectChanges();

    const toggles = fixture.debugElement.queryAll(By.css('.toggle-btn'));
    toggles[1].triggerEventHandler('click', undefined);

    expect(component['filter']()).toBe('image');
  });

  it('renders an img thumbnail for image content using thumbUrl', () => {
    fixture.componentRef.setInput('availableContent', [buildContent({ id: 'c9', type: 'image' })]);
    fixture.detectChanges();

    const img = fixture.debugElement.query(By.css('.content-thumb'));
    expect(img.nativeElement.getAttribute('src')).toBe('/thumb/c9');
  });

  it('renders a video placeholder for video content', () => {
    fixture.componentRef.setInput('availableContent', [buildContent({ type: 'video' })]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.content-thumb-video'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.content-thumb'))).toBeNull();
  });

  it('emits selectContent with the picked content', () => {
    const picked = buildContent({ id: 'pick' });
    fixture.componentRef.setInput('availableContent', [picked]);
    fixture.detectChanges();

    const spy = vi.fn();
    component.selectContent.subscribe(spy);
    fixture.debugElement.query(By.css('.content-item')).triggerEventHandler('click', undefined);

    expect(spy).toHaveBeenCalledWith(picked);
  });

  it('emits dismiss when Close is clicked', () => {
    fixture.detectChanges();

    const spy = vi.fn();
    component.dismiss.subscribe(spy);
    fixture.debugElement.query(By.css('.btn-secondary')).triggerEventHandler('click', undefined);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
