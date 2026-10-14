import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { PlaylistCreateForm } from './playlist-create-form';
import { BtnComponent } from '../ui';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

function btnByText(fixture: ComponentFixture<PlaylistCreateForm>, text: string) {
  return fixture.debugElement
    .queryAll(By.directive(BtnComponent))
    .find((b) => (b.nativeElement.textContent as string).trim().includes(text));
}

describe('PlaylistCreateForm', () => {
  let fixture: ComponentFixture<PlaylistCreateForm>;
  let component: PlaylistCreateForm;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PlaylistCreateForm,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaylistCreateForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', '');
    fixture.componentRef.setInput('color', '#6d6cf6');
    fixture.componentRef.setInput('error', '');
    fixture.componentRef.setInput('creating', false);
  });

  it('emits create when the Create button is clicked', () => {
    const spy = vi.fn();
    component.create.subscribe(spy);
    fixture.detectChanges();

    btnByText(fixture, 'Create playlist')!.triggerEventHandler('mnsClick', new MouseEvent('click'));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when Cancel is clicked', () => {
    const spy = vi.fn();
    component.dismiss.subscribe(spy);
    fixture.detectChanges();

    btnByText(fixture, 'Cancel')!.triggerEventHandler('mnsClick', new MouseEvent('click'));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not render the error paragraph when error is empty', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Name is required.');
  });

  it('renders the error message when error is set', () => {
    fixture.componentRef.setInput('error', 'Name is required.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Name is required.');
  });

  it('disables the submit button and shows "Creating…" while creating', () => {
    fixture.componentRef.setInput('creating', true);
    fixture.detectChanges();

    const submit = btnByText(fixture, 'Creating')!;
    expect(submit.componentInstance.disabled()).toBe(true);
    expect(submit.nativeElement.textContent).toContain('Creating');
  });

  it('shows "Create playlist" label and is enabled when not creating', () => {
    fixture.detectChanges();

    const submit = btnByText(fixture, 'Create playlist')!;
    expect(submit.componentInstance.disabled()).toBe(false);
  });

  it('exposes the name via the writable model', () => {
    fixture.componentRef.setInput('name', 'My Loop');
    fixture.detectChanges();

    expect(component.name()).toBe('My Loop');
  });

  it('updates the color model when a swatch is clicked', () => {
    fixture.detectChanges();

    const swatch = fixture.debugElement.query(
      By.css('button[aria-label="Set accent colour #ec4899"]'),
    );
    swatch.triggerEventHandler('click', new MouseEvent('click'));

    expect(component.color()).toBe('#ec4899');
  });

  describe('dynamic kind', () => {
    const sources = [
      {
        id: 's1',
        organisationId: 'org1',
        name: 'Concertbüro',
        adapterType: 'x',
        params: {},
        formats: ['1080x1920' as const],
        style: { background: 'black' as const, accentColor: '#e30613' },
        syncIntervalMinutes: 360,
        enabled: true,
        nextSyncAt: null,
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
        lastSyncSummary: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    it('switches the kind from the radio cards', () => {
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('[data-kind="dynamic"]') as HTMLElement).click();
      fixture.detectChanges();

      expect(component.kind()).toBe('dynamic');
    });

    it('points to the sources page when there is no source yet', () => {
      fixture.componentRef.setInput('kind', 'dynamic');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.no-sources')).not.toBeNull();
    });

    it('picks a format the chosen sources render', () => {
      fixture.componentRef.setInput('kind', 'dynamic');
      fixture.componentRef.setInput('sources', sources);
      fixture.componentRef.setInput('format', '1920x1080');
      fixture.detectChanges();

      component['onSourcesChange'](['s1']);

      expect(component.sourceIds()).toEqual(['s1']);
      expect(component.format()).toBe('1080x1920');
    });
  });
});
