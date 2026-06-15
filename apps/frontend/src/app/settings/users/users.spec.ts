import { TestBed, ComponentFixture, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { Users } from './users';
import { MemberService } from './member.service';
import { Membership, MyMembership, OrganisationRole } from './member.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org-1';

function myMembership(role: OrganisationRole, orgId = ORG_ID): MyMembership {
  return {
    id: `mm-${role}`,
    userId: 'me',
    organisationId: orgId,
    role,
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'm-1',
    userId: 'u-1',
    organisationId: ORG_ID,
    role: 'viewer',
    createdAt: '2024-01-02T00:00:00.000Z',
    status: 'active',
    user: {
      id: 'u-1',
      email: 'user@example.com',
      name: 'User One',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

interface MemberServiceStub {
  getMyMemberships: ReturnType<typeof vi.fn>;
  listMembers: ReturnType<typeof vi.fn>;
  addMember: ReturnType<typeof vi.fn>;
  updateRole: ReturnType<typeof vi.fn>;
  removeMember: ReturnType<typeof vi.fn>;
}

describe('Users', () => {
  let fixture: ComponentFixture<Users>;
  let component: Users;
  let memberService: MemberServiceStub;

  function setup(): void {
    memberService = {
      getMyMemberships: vi.fn().mockReturnValue(of([myMembership('org_admin')])),
      listMembers: vi.fn().mockReturnValue(of([membership()])),
      addMember: vi.fn().mockReturnValue(of(membership())),
      updateRole: vi.fn().mockReturnValue(of(membership({ role: 'editor' }))),
      removeMember: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [Users],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MemberService, useValue: memberService },
      ],
    });

    fixture = TestBed.createComponent(Users);
    component = fixture.componentInstance;
  }

  describe('org resolution on init', () => {
    it('should create and resolve admin org', () => {
      setup();
      fixture.detectChanges();

      expect(component).toBeTruthy();
      expect(component.orgId).toBe(ORG_ID);
      expect(memberService.listMembers).toHaveBeenCalledWith(ORG_ID);
    });

    it('should load members and clear loading', () => {
      setup();
      const members = [membership(), membership({ id: 'm-2', userId: 'u-2' })];
      memberService.listMembers.mockReturnValue(of(members));

      fixture.detectChanges();

      expect(component.members()).toEqual(members);
      expect(component.loading()).toBe(false);
      expect(component.loadError()).toBe('');
    });

    it('should error when member has no org_admin role', () => {
      setup();
      memberService.getMyMemberships.mockReturnValue(of([myMembership('editor')]));

      fixture.detectChanges();

      expect(component.loadError()).toBe('You do not have Org Admin access to any organisation.');
      expect(component.loading()).toBe(false);
      expect(memberService.listMembers).not.toHaveBeenCalled();
    });

    it('should error when not a member of any org', () => {
      setup();
      memberService.getMyMemberships.mockReturnValue(of([]));

      fixture.detectChanges();

      expect(component.loadError()).toBe('You are not a member of any organisation.');
      expect(component.loading()).toBe(false);
    });

    it('should error when memberships call fails', () => {
      setup();
      memberService.getMyMemberships.mockReturnValue(throwError(() => new Error('x')));

      fixture.detectChanges();

      expect(component.loadError()).toBe('Failed to load organisation context.');
      expect(component.loading()).toBe(false);
    });
  });

  describe('loadMembers error handling', () => {
    it('should map 403 to access denied message', () => {
      setup();
      memberService.listMembers.mockReturnValue(throwError(() => ({ status: 403 })));

      fixture.detectChanges();

      expect(component.loadError()).toBe('Access denied. Org Admin privileges required.');
      expect(component.loading()).toBe(false);
    });

    it('should map other errors to generic message', () => {
      setup();
      memberService.listMembers.mockReturnValue(throwError(() => ({ status: 500 })));

      fixture.detectChanges();

      expect(component.loadError()).toBe('Failed to load members.');
    });
  });

  describe('conditional rendering', () => {
    it('should render a member grid row per member', () => {
      setup();
      memberService.listMembers.mockReturnValue(
        of([membership(), membership({ id: 'm-2', userId: 'u-2' })]),
      );

      fixture.detectChanges();

      // Each member renders an mns-avatar in its grid row.
      const avatars = fixture.debugElement.queryAll(By.css('mns-avatar'));
      expect(avatars.length).toBe(2);
      expect(fixture.debugElement.query(By.css('.btn-primary'))).toBeTruthy();
    });

    it('should render empty state when no members and no error', () => {
      setup();
      memberService.listMembers.mockReturnValue(of([]));

      fixture.detectChanges();

      const empty = fixture.debugElement.query(By.css('.empty-text'));
      expect(empty.nativeElement.textContent).toContain('No members found.');
      expect(fixture.debugElement.query(By.css('mns-avatar'))).toBeNull();
    });

    it('should render a "Pending invite" badge for pending members', () => {
      setup();
      memberService.listMembers.mockReturnValue(of([membership({ status: 'pending' })]));

      fixture.detectChanges();

      const badge = fixture.debugElement.query(By.css('mns-badge'));
      expect(badge).toBeTruthy();
      expect(badge.nativeElement.textContent).toContain('Pending invite');
    });

    it('should render an "Active" badge for active members', () => {
      setup();
      memberService.listMembers.mockReturnValue(of([membership({ status: 'active' })]));

      fixture.detectChanges();

      const badge = fixture.debugElement.query(By.css('mns-badge'));
      expect(badge).toBeTruthy();
      expect(badge.nativeElement.textContent).toContain('Active');
    });

    it('should render fallback name for members without a name', () => {
      setup();
      memberService.listMembers.mockReturnValue(
        of([membership({ user: { ...membership().user, name: null } })]),
      );

      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Invite pending');
    });

    it('should render loadError text', () => {
      setup();
      memberService.getMyMemberships.mockReturnValue(of([]));

      fixture.detectChanges();

      const errorEl = fixture.debugElement.query(By.css('.error'));
      expect(errorEl.nativeElement.textContent).toContain(
        'You are not a member of any organisation.',
      );
    });
  });

  describe('invite modal', () => {
    it('should open and reset invite form', () => {
      setup();
      fixture.detectChanges();

      component.inviteEmail.set('stale@example.com');
      component.inviteRole.set('org_admin');
      component.inviteError.set('old error');

      component.openInviteModal();

      expect(component.showInviteModal()).toBe(true);
      expect(component.inviteEmail()).toBe('');
      expect(component.inviteRole()).toBe('viewer');
      expect(component.inviteError()).toBe('');
    });

    it('should render modal when open', async () => {
      setup();
      fixture.detectChanges();

      component.openInviteModal();
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('mns-overlay'))).toBeTruthy();
    });

    it('should close the modal', () => {
      setup();
      fixture.detectChanges();
      component.openInviteModal();

      component.closeInviteModal();

      expect(component.showInviteModal()).toBe(false);
    });

    it('should validate required email before submit', () => {
      setup();
      fixture.detectChanges();
      component.openInviteModal();
      component.inviteEmail.set('');

      component.submitInvite();

      expect(component.inviteError()).toBe('A valid email is required.');
      expect(memberService.addMember).not.toHaveBeenCalled();
    });

    it('should add member, close modal and reload on success', () => {
      setup();
      fixture.detectChanges();
      memberService.listMembers.mockClear();
      component.openInviteModal();
      component.inviteEmail.set('new@example.com');
      component.inviteRole.set('editor');

      component.submitInvite();

      expect(memberService.addMember).toHaveBeenCalledWith(ORG_ID, {
        email: 'new@example.com',
        role: 'editor',
      });
      expect(component.inviting()).toBe(false);
      expect(component.showInviteModal()).toBe(false);
      expect(memberService.listMembers).toHaveBeenCalled();
    });

    it('should surface server error on invite failure', () => {
      setup();
      fixture.detectChanges();
      memberService.addMember.mockReturnValue(
        throwError(() => ({ error: { message: 'Already a member' } })),
      );
      component.openInviteModal();
      component.inviteEmail.set('dup@example.com');

      component.submitInvite();

      expect(component.inviteError()).toBe('Already a member');
      expect(component.inviting()).toBe(false);
      expect(component.showInviteModal()).toBe(true);
    });

    it('should use fallback message on invite failure without message', () => {
      setup();
      fixture.detectChanges();
      memberService.addMember.mockReturnValue(throwError(() => ({})));
      component.openInviteModal();
      component.inviteEmail.set('dup@example.com');

      component.submitInvite();

      expect(component.inviteError()).toBe('Failed to invite user.');
    });
  });

  describe('changeRole', () => {
    it('should no-op when role is unchanged', () => {
      setup();
      fixture.detectChanges();
      const member = membership({ role: 'viewer' });

      component.changeRole(member, 'viewer');

      expect(memberService.updateRole).not.toHaveBeenCalled();
      expect(component.updatingUserId()).toBeNull();
    });

    it('should update role and apply server result', () => {
      setup();
      const existing = membership({ role: 'viewer' });
      memberService.listMembers.mockReturnValue(of([existing]));
      fixture.detectChanges();
      memberService.updateRole.mockReturnValue(of(membership({ role: 'editor' })));

      component.changeRole(existing, 'editor');

      expect(memberService.updateRole).toHaveBeenCalledWith(ORG_ID, existing.userId, {
        role: 'editor',
      });
      expect(component.members().find((m) => m.userId === existing.userId)?.role).toBe('editor');
      expect(component.updatingUserId()).toBeNull();
    });

    it('should surface error and reset updating flag on failure', () => {
      setup();
      fixture.detectChanges();
      const member = membership({ role: 'viewer' });
      memberService.updateRole.mockReturnValue(
        throwError(() => ({ error: { message: 'Cannot demote last admin' } })),
      );

      component.changeRole(member, 'editor');

      expect(component.actionError()).toBe('Cannot demote last admin');
      expect(component.updatingUserId()).toBeNull();
    });

    it('should use fallback error message on role failure', () => {
      setup();
      fixture.detectChanges();
      memberService.updateRole.mockReturnValue(throwError(() => ({})));

      component.changeRole(membership({ role: 'viewer' }), 'editor');

      expect(component.actionError()).toBe('Failed to update role.');
    });
  });

  describe('remove flow', () => {
    it('should open the confirmation dialog', () => {
      setup();
      fixture.detectChanges();
      const member = membership();

      component.confirmRemove(member);

      expect(component.showRemoveConfirm()).toBe(true);
      expect(component.removingMember()).toBe(member);
    });

    it('should render confirmation modal with member email', async () => {
      setup();
      fixture.detectChanges();

      component.confirmRemove(membership());
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const modal = fixture.debugElement.query(By.css('mns-overlay'));
      expect(modal.nativeElement.textContent).toContain('user@example.com');
    });

    it('should cancel removal and clear state', () => {
      setup();
      fixture.detectChanges();
      component.confirmRemove(membership());

      component.cancelRemove();

      expect(component.showRemoveConfirm()).toBe(false);
      expect(component.removingMember()).toBeNull();
    });

    it('should no-op execute when no member selected', () => {
      setup();
      fixture.detectChanges();
      component.removingMember.set(null);

      component.executeRemove();

      expect(memberService.removeMember).not.toHaveBeenCalled();
    });

    it('should remove member, close dialog and reload on success', () => {
      setup();
      fixture.detectChanges();
      memberService.listMembers.mockClear();
      const member = membership();
      component.confirmRemove(member);

      component.executeRemove();

      expect(memberService.removeMember).toHaveBeenCalledWith(ORG_ID, member.userId);
      expect(component.removingUserId()).toBeNull();
      expect(component.showRemoveConfirm()).toBe(false);
      expect(component.removingMember()).toBeNull();
      expect(memberService.listMembers).toHaveBeenCalled();
    });

    it('should surface error and reset state on remove failure', () => {
      setup();
      fixture.detectChanges();
      memberService.removeMember.mockReturnValue(
        throwError(() => ({ error: { message: 'Cannot remove yourself' } })),
      );
      component.confirmRemove(membership());

      component.executeRemove();

      expect(component.actionError()).toBe('Cannot remove yourself');
      expect(component.removingUserId()).toBeNull();
      expect(component.showRemoveConfirm()).toBe(false);
      expect(component.removingMember()).toBeNull();
    });

    it('should use fallback message on remove failure without message', () => {
      setup();
      fixture.detectChanges();
      memberService.removeMember.mockReturnValue(throwError(() => ({})));
      component.confirmRemove(membership());

      component.executeRemove();

      expect(component.actionError()).toBe('Failed to remove member.');
    });
  });

  describe('navigation', () => {
    it('should navigate home on goBack', () => {
      setup();
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.goBack();

      expect(navSpy).toHaveBeenCalledWith(['/']);
    });
  });
});
