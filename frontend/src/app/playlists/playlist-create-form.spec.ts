import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PlaylistCreateForm } from './playlist-create-form';

describe('PlaylistCreateForm', () => {
  let fixture: ComponentFixture<PlaylistCreateForm>;
  let component: PlaylistCreateForm;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaylistCreateForm],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaylistCreateForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', '');
    fixture.componentRef.setInput('error', '');
    fixture.componentRef.setInput('creating', false);
  });

  it('emits create on form submit', () => {
    const spy = vi.fn();
    component.create.subscribe(spy);
    fixture.detectChanges();

    const form = fixture.debugElement.query(By.css('form'));
    form.triggerEventHandler('ngSubmit', undefined);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when Cancel is clicked', () => {
    const spy = vi.fn();
    component.dismiss.subscribe(spy);
    fixture.detectChanges();

    const cancel = fixture.debugElement.query(By.css('.btn-secondary'));
    cancel.triggerEventHandler('click', undefined);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not render the error paragraph when error is empty', () => {
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.error'))).toBeNull();
  });

  it('renders the error message when error is set', () => {
    fixture.componentRef.setInput('error', 'Name is required.');
    fixture.detectChanges();

    const error = fixture.debugElement.query(By.css('.error'));
    expect(error.nativeElement.textContent).toContain('Name is required.');
  });

  it('disables the submit button and shows "Creating..." while creating', () => {
    fixture.componentRef.setInput('creating', true);
    fixture.detectChanges();

    const submit = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submit.nativeElement.disabled).toBe(true);
    expect(submit.nativeElement.textContent).toContain('Creating...');
  });

  it('shows "Create Playlist" label and is enabled when not creating', () => {
    fixture.detectChanges();

    const submit = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submit.nativeElement.disabled).toBe(false);
    expect(submit.nativeElement.textContent).toContain('Create Playlist');
  });

  it('exposes the name via the writable model', () => {
    fixture.componentRef.setInput('name', 'My Loop');
    fixture.detectChanges();

    expect(component.name()).toBe('My Loop');
  });
});
