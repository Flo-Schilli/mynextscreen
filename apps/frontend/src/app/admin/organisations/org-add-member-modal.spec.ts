import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { OrgAddMemberModal, AddMemberPayload } from './org-add-member-modal';

interface AddMemberFields {
  email: WritableSignal<string>;
  role: WritableSignal<string>;
}

function fields(component: OrgAddMemberModal): AddMemberFields {
  return component as unknown as AddMemberFields;
}

describe('OrgAddMemberModal', () => {
  let fixture: ComponentFixture<OrgAddMemberModal>;
  let component: OrgAddMemberModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgAddMemberModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrgAddMemberModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('adding', false);
    fixture.componentRef.setInput('error', '');
  });

  it('defaults the role to viewer', () => {
    // Assert
    expect(fields(component).role()).toBe('viewer');
  });

  it('shows a local validation error and does not emit when email is empty', () => {
    // Arrange
    const spy = vi.fn();
    component.add.subscribe(spy);
    fixture.detectChanges();

    // Act
    component.onSubmit();
    fixture.detectChanges();

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Email is required.',
    );
  });

  it('emits the add payload with the entered email and role', () => {
    // Arrange
    let payload: AddMemberPayload | undefined;
    component.add.subscribe((p) => (payload = p));
    fixture.detectChanges();
    fields(component).email.set('new@example.com');

    // Act
    component.onSubmit();

    // Assert
    expect(payload).toEqual({ email: 'new@example.com', role: 'viewer' });
  });

  it('clears the local error once a valid email is submitted', () => {
    // Arrange
    fixture.detectChanges();
    component.onSubmit(); // sets local error
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.error'))).not.toBeNull();

    fields(component).email.set('a@b.com');

    // Act
    component.onSubmit();
    fixture.detectChanges();

    // Assert
    expect(fixture.debugElement.query(By.css('.error'))).toBeNull();
  });

  it('renders the parent error when provided', () => {
    // Arrange
    fixture.componentRef.setInput('error', 'Already a member.');

    // Act
    fixture.detectChanges();

    // Assert
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Already a member.',
    );
  });

  it('disables the submit button while adding', () => {
    // Arrange
    fixture.componentRef.setInput('adding', true);

    // Act
    fixture.detectChanges();

    // Assert
    const submit = fixture.debugElement
      .queryAll(By.css('mns-btn'))
      .find((b) => b.nativeElement.textContent.includes('Adding'));
    expect(submit?.nativeElement.textContent).toContain('Adding');
    expect(submit?.componentInstance.disabled()).toBe(true);
  });

  it('emits dismiss when Cancel is clicked', () => {
    // Arrange
    const spy = vi.fn();
    component.dismiss.subscribe(spy);
    fixture.detectChanges();

    // Act
    const cancel = fixture.debugElement
      .queryAll(By.css('mns-btn'))
      .find((b) => b.nativeElement.textContent.includes('Cancel'));
    cancel?.componentInstance.mnsClick.emit(new MouseEvent('click'));

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the overlay backdrop is closed', () => {
    // Arrange
    const spy = vi.fn();
    component.dismiss.subscribe(spy);
    fixture.detectChanges();

    // Act
    fixture.debugElement.query(By.css('mns-overlay')).componentInstance.closed.emit();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
