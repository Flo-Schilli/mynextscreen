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

/** Member rows carry a remove button (mns-btn). */
function memberRows(fixture: ComponentFixture<OrgMemberList>) {
  return fixture.debugElement
    .queryAll(By.css('.grid'))
    .filter((row) => row.query(By.css('mns-btn')) !== null);
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
    expect(memberRows(fixture).length).toBe(2);
  });

  it('shows the member email and falls back to "(no name)" when name is null', () => {
    // Arrange
    fixture.componentRef.setInput('members', [
      makeOrgMember({ user: { ...makeOrgMember().user, name: null } }),
    ]);

    // Act
    fixture.detectChanges();

    // Assert
    const row = memberRows(fixture)[0];
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
    fixture.debugElement.query(By.css('.role-select')).componentInstance.changed.emit('org_admin');

    // Assert
    expect(spy).toHaveBeenCalledWith({ member, newRole: 'org_admin' });
  });

  it('reflects the current role as the selected value', () => {
    // Arrange
    fixture.componentRef.setInput('members', [makeOrgMember({ role: 'viewer' })]);

    // Act
    fixture.detectChanges();

    // Assert
    const select = fixture.debugElement.query(By.css('.role-select'));
    expect(select.componentInstance.value()).toBe('viewer');
  });

  it('emits removeMember with the member when Remove is clicked', () => {
    // Arrange
    const member = makeOrgMember();
    fixture.componentRef.setInput('members', [member]);
    const spy = vi.fn();
    component.removeMember.subscribe(spy);
    fixture.detectChanges();

    // Act
    memberRows(fixture)[0]
      .query(By.css('mns-btn'))
      .componentInstance.mnsClick.emit(new MouseEvent('click'));

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
    const button = memberRows(fixture)[0].query(By.css('mns-btn'));
    expect(button.componentInstance.disabled()).toBe(true);
  });
});
