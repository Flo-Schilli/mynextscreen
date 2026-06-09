import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { OrgRemoveMemberModal } from './org-remove-member-modal';
import { OrgMember } from './organisation.model';

function makeOrgMember(overrides: Partial<OrgMember> = {}): OrgMember {
  return {
    id: 'mem-1',
    userId: 'user-1',
    organisationId: 'org-1',
    role: 'editor',
    createdAt: '2026-01-01T00:00:00.000Z',
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('OrgRemoveMemberModal', () => {
  let fixture: ComponentFixture<OrgRemoveMemberModal>;
  let component: OrgRemoveMemberModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgRemoveMemberModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrgRemoveMemberModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('member', makeOrgMember());
    fixture.componentRef.setInput('removing', false);
  });

  it('renders the member email in the confirmation prompt', () => {
    // Arrange
    fixture.componentRef.setInput(
      'member',
      makeOrgMember({ user: { ...makeOrgMember().user, email: 'bob@example.com' } }),
    );

    // Act
    fixture.detectChanges();

    // Assert
    expect(fixture.nativeElement.textContent).toContain('bob@example.com');
  });

  it('shows the "Remove" label and enables the confirm button when not removing', () => {
    // Act
    fixture.detectChanges();

    // Assert
    const confirm = fixture.debugElement.query(By.css('.btn-danger'));
    expect(confirm.nativeElement.disabled).toBe(false);
    expect(confirm.nativeElement.textContent).toContain('Remove');
  });

  it('shows "Removing..." and disables the confirm button while removing', () => {
    // Arrange
    fixture.componentRef.setInput('removing', true);

    // Act
    fixture.detectChanges();

    // Assert
    const confirm = fixture.debugElement.query(By.css('.btn-danger'));
    expect(confirm.nativeElement.disabled).toBe(true);
    expect(confirm.nativeElement.textContent).toContain('Removing...');
  });

  it('emits confirm when the Remove button is clicked', () => {
    // Arrange
    const spy = vi.fn();
    component.confirm.subscribe(spy);
    fixture.detectChanges();

    // Act
    fixture.debugElement.query(By.css('.btn-danger')).triggerEventHandler('click', undefined);

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
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
