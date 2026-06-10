import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { OrgAddMemberModal, AddMemberPayload } from './org-add-member-modal';

/**
 * Type into a field through ngModel and flush view <-> model. ngModel write-back
 * is asynchronous under zoneless change detection, so detect changes then await
 * stability after dispatching the input event.
 */
async function typeInto(
  fixture: ComponentFixture<unknown>,
  selector: string,
  value: string,
): Promise<void> {
  const el: HTMLInputElement = fixture.nativeElement.querySelector(selector);
  el.value = value;
  el.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  await fixture.whenStable();
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
    expect((component as unknown as { role: string }).role).toBe('viewer');
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

  it('emits the add payload with the entered email and role', async () => {
    // Arrange
    let payload: AddMemberPayload | undefined;
    component.add.subscribe((p) => (payload = p));
    fixture.detectChanges();
    await fixture.whenStable(); // let NgForm register its controls

    await typeInto(fixture, '#memberEmail', 'new@example.com');

    // Act
    component.onSubmit();

    // Assert
    expect(payload).toEqual({ email: 'new@example.com', role: 'viewer' });
  });

  it('clears the local error once a valid email is submitted', async () => {
    // Arrange
    fixture.detectChanges();
    await fixture.whenStable(); // let NgForm register its controls
    component.onSubmit(); // sets local error
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.error'))).not.toBeNull();

    await typeInto(fixture, '#memberEmail', 'a@b.com');

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

  it('shows "Adding..." and disables submit while adding', () => {
    // Arrange
    fixture.componentRef.setInput('adding', true);

    // Act
    fixture.detectChanges();

    // Assert
    const submit = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submit.nativeElement.disabled).toBe(true);
    expect(submit.nativeElement.textContent).toContain('Adding...');
  });

  it('emits dismiss when Cancel is clicked', () => {
    // Arrange
    const spy = vi.fn();
    component.dismiss.subscribe(spy);
    fixture.detectChanges();

    // Act
    fixture.debugElement.query(By.css('.btn-secondary')).triggerEventHandler('click', undefined);

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the overlay backdrop is clicked', () => {
    // Arrange
    const spy = vi.fn();
    component.dismiss.subscribe(spy);
    fixture.detectChanges();

    // Act
    fixture.debugElement.query(By.css('.modal-overlay')).triggerEventHandler('click', undefined);

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
