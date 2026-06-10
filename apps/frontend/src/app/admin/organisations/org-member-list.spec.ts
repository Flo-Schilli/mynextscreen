import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { OrgMemberList } from './org-member-list';
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

describe('OrgMemberList', () => {
  let fixture: ComponentFixture<OrgMemberList>;
  let component: OrgMemberList;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgMemberList],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrgMemberList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('members', []);
    fixture.componentRef.setInput('updatingMemberId', null);
    fixture.componentRef.setInput('removingMemberId', null);
  });

  it('renders one row per member', () => {
    // Arrange
    fixture.componentRef.setInput('members', [
      makeOrgMember({ id: 'mem-1', userId: 'u1' }),
      makeOrgMember({ id: 'mem-2', userId: 'u2' }),
    ]);

    // Act
    fixture.detectChanges();

    // Assert
    expect(fixture.debugElement.queryAll(By.css('tbody tr')).length).toBe(2);
  });

  it('shows the member email and falls back to "(no name)" when name is null', () => {
    // Arrange
    fixture.componentRef.setInput('members', [
      makeOrgMember({ user: { ...makeOrgMember().user, name: null } }),
    ]);

    // Act
    fixture.detectChanges();

    // Assert
    const row = fixture.debugElement.query(By.css('tbody tr'));
    expect(row.nativeElement.textContent).toContain('(no name)');
    expect(row.nativeElement.textContent).toContain('user@example.com');
  });

  it('emits changeRole with the member and new role on selection change', () => {
    // Arrange
    const member = makeOrgMember();
    fixture.componentRef.setInput('members', [member]);
    const spy = vi.fn();
    component.changeRole.subscribe(spy);
    fixture.detectChanges();

    // Act
    const select = fixture.debugElement.query(By.css('.role-select'));
    select.triggerEventHandler('ngModelChange', 'org_admin');

    // Assert
    expect(spy).toHaveBeenCalledWith({ member, newRole: 'org_admin' });
  });

  it('disables the role select for the member whose role is updating', async () => {
    // Arrange
    fixture.componentRef.setInput('members', [makeOrgMember({ userId: 'u1' })]);
    fixture.componentRef.setInput('updatingMemberId', 'u1');

    // Act — ngModel-bound select settles its disabled binding asynchronously
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Assert
    const select = fixture.debugElement.query(By.css('.role-select'));
    expect(select.nativeElement.disabled).toBe(true);
  });

  it('emits removeMember with the member when Remove is clicked', () => {
    // Arrange
    const member = makeOrgMember();
    fixture.componentRef.setInput('members', [member]);
    const spy = vi.fn();
    component.removeMember.subscribe(spy);
    fixture.detectChanges();

    // Act
    fixture.debugElement.query(By.css('.btn-danger')).triggerEventHandler('click', undefined);

    // Assert
    expect(spy).toHaveBeenCalledWith(member);
  });

  it('disables the remove button for the member being removed', () => {
    // Arrange
    fixture.componentRef.setInput('members', [makeOrgMember({ userId: 'u1' })]);
    fixture.componentRef.setInput('removingMemberId', 'u1');

    // Act
    fixture.detectChanges();

    // Assert
    const button = fixture.debugElement.query(By.css('.btn-danger'));
    expect(button.nativeElement.disabled).toBe(true);
  });
});
