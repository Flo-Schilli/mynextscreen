import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
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
      providers: [provideZonelessChangeDetection()],
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
});
