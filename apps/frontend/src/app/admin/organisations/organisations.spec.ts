import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Organisations } from './organisations';
import { OrganisationService } from './organisation.service';
import { Organisation, OrgMember } from './organisation.model';
import { OrganisationFormPayload } from './org-form';

function makeOrganisation(overrides: Partial<Organisation> = {}): Organisation {
  return {
    id: 'org-1',
    name: 'Acme Venue',
    timeZone: 'Europe/Vienna',
    storageOriginalLimitBytes: 1024,
    storageTranscodedLimitBytes: 2048,
    storageOriginalUsedBytes: 100,
    storageTranscodedUsedBytes: 200,
    defaultPlaylistId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

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

interface OrgServiceStub {
  getAll: ReturnType<typeof vi.fn>;
  getOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  listMembers: ReturnType<typeof vi.fn>;
  addMember: ReturnType<typeof vi.fn>;
  updateMemberRole: ReturnType<typeof vi.fn>;
  removeMember: ReturnType<typeof vi.fn>;
}

describe('Organisations', () => {
  let fixture: ComponentFixture<Organisations>;
  let component: Organisations;
  let orgStub: OrgServiceStub;
  let router: Router;

  beforeEach(async () => {
    orgStub = {
      getAll: vi.fn(() => of([])),
      getOne: vi.fn(() => of(makeOrganisation())),
      create: vi.fn(() => of(makeOrganisation())),
      update: vi.fn(() => of(makeOrganisation())),
      listMembers: vi.fn(() => of([])),
      addMember: vi.fn(() => of(makeOrgMember())),
      updateMemberRole: vi.fn(() => of(makeOrgMember())),
      removeMember: vi.fn(() => of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [Organisations],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: OrganisationService, useValue: orgStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Organisations);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  describe('loadOrganisations', () => {
    it('loads orgs and their member counts on init', () => {
      // Arrange
      orgStub.getAll.mockReturnValue(
        of([makeOrganisation({ id: 'org-1' }), makeOrganisation({ id: 'org-2' })]),
      );
      orgStub.listMembers.mockReturnValue(of([makeOrgMember(), makeOrgMember({ id: 'mem-2' })]));

      // Act
      fixture.detectChanges(); // ngOnInit

      // Assert
      expect(component.organisations.length).toBe(2);
      expect(component.loading).toBe(false);
      expect(component.memberCounts['org-1']).toBe(2);
      expect(component.memberCounts['org-2']).toBe(2);
    });

    it('records a member count of 0 when a per-org member lookup fails', () => {
      // Arrange
      orgStub.getAll.mockReturnValue(of([makeOrganisation({ id: 'org-1' })]));
      orgStub.listMembers.mockReturnValue(throwError(() => new Error('nope')));

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.memberCounts['org-1']).toBe(0);
    });

    it('maps a 403 to a super-admin access-denied message', () => {
      // Arrange
      orgStub.getAll.mockReturnValue(throwError(() => ({ status: 403 })));

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.loadError).toContain('Instance Admin privileges required');
      expect(component.loading).toBe(false);
    });

    it('maps other errors to a generic load message', () => {
      // Arrange
      orgStub.getAll.mockReturnValue(throwError(() => ({ status: 500 })));

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.loadError).toBe('Failed to load organisations.');
    });
  });

  describe('org selection', () => {
    beforeEach(() => fixture.detectChanges());

    it('selects an org and loads its members', () => {
      // Arrange
      orgStub.listMembers.mockReturnValue(of([makeOrgMember()]));
      const org = makeOrganisation({ id: 'org-9' });

      // Act
      component.selectOrg(org);

      // Assert
      expect(component.selectedOrg).toBe(org);
      expect(component.members.length).toBe(1);
      expect(component.membersLoading).toBe(false);
    });

    it('sets an error when member loading fails', () => {
      // Arrange
      orgStub.listMembers.mockReturnValue(throwError(() => new Error('x')));

      // Act
      component.selectOrg(makeOrganisation());

      // Assert
      expect(component.membersError).toBe('Failed to load members.');
      expect(component.membersLoading).toBe(false);
    });

    it('deselects an org and clears member state', () => {
      // Arrange
      component.selectedOrg = makeOrganisation();
      component.members = [makeOrgMember()];
      component.membersError = 'old';

      // Act
      component.deselectOrg();

      // Assert
      expect(component.selectedOrg).toBeNull();
      expect(component.members).toEqual([]);
      expect(component.membersError).toBe('');
    });
  });

  describe('org form', () => {
    beforeEach(() => fixture.detectChanges());

    it('opens the create form with cleared editing state', () => {
      // Arrange
      component.editingOrg = makeOrganisation();
      component.formError = 'old';

      // Act
      component.openCreateForm();

      // Assert
      expect(component.showForm).toBe(true);
      expect(component.editingOrg).toBeNull();
      expect(component.formError).toBe('');
    });

    it('opens the edit form seeded with the org', () => {
      // Arrange
      const org = makeOrganisation({ id: 'org-edit' });

      // Act
      component.openEditForm(org);

      // Assert
      expect(component.showForm).toBe(true);
      expect(component.editingOrg).toBe(org);
    });

    it('cancels the form and resets state', () => {
      // Arrange
      component.showForm = true;
      component.editingOrg = makeOrganisation();

      // Act
      component.cancelForm();

      // Assert
      expect(component.showForm).toBe(false);
      expect(component.editingOrg).toBeNull();
    });

    it('creates a new org and reloads the list', () => {
      // Arrange
      const payload: OrganisationFormPayload = {
        name: 'New',
        timeZone: 'UTC',
        storageOriginalLimitBytes: 1,
        storageTranscodedLimitBytes: 2,
      };
      component.editingOrg = null;

      // Act
      component.submitForm(payload);

      // Assert
      expect(orgStub.create).toHaveBeenCalledWith(payload);
      expect(orgStub.update).not.toHaveBeenCalled();
      expect(component.showForm).toBe(false);
      expect(component.submitting).toBe(false);
      expect(orgStub.getAll).toHaveBeenCalledTimes(2); // init + reload
    });

    it('updates an existing org and refreshes the selected org', () => {
      // Arrange
      const updated = makeOrganisation({ id: 'org-7', name: 'Renamed' });
      orgStub.update.mockReturnValue(of(updated));
      component.editingOrg = makeOrganisation({ id: 'org-7' });
      component.selectedOrg = makeOrganisation({ id: 'org-7' });
      const payload: OrganisationFormPayload = {
        name: 'Renamed',
        timeZone: 'UTC',
        storageOriginalLimitBytes: 1,
        storageTranscodedLimitBytes: 2,
      };

      // Act
      component.submitForm(payload);

      // Assert
      expect(orgStub.update).toHaveBeenCalledWith('org-7', payload);
      expect(component.selectedOrg).toBe(updated);
      expect(component.editingOrg).toBeNull();
    });

    it('surfaces a server error message on submit failure', () => {
      // Arrange
      orgStub.create.mockReturnValue(throwError(() => ({ error: { message: 'duplicate' } })));
      component.editingOrg = null;

      // Act
      component.submitForm({
        name: 'X',
        timeZone: 'UTC',
        storageOriginalLimitBytes: 0,
        storageTranscodedLimitBytes: 0,
      });

      // Assert
      expect(component.formError).toBe('duplicate');
      expect(component.submitting).toBe(false);
    });

    it('falls back to a generic message when the error has no body message', () => {
      // Arrange
      orgStub.create.mockReturnValue(throwError(() => ({})));
      component.editingOrg = null;

      // Act
      component.submitForm({
        name: 'X',
        timeZone: 'UTC',
        storageOriginalLimitBytes: 0,
        storageTranscodedLimitBytes: 0,
      });

      // Assert
      expect(component.formError).toBe('An error occurred. Please try again.');
    });
  });

  describe('add member', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedOrg = makeOrganisation({ id: 'org-1' });
    });

    it('opens and closes the add-member modal', () => {
      // Act
      component.openAddMemberModal();
      // Assert
      expect(component.showAddMemberModal).toBe(true);
      expect(component.addMemberError).toBe('');

      // Act
      component.closeAddMemberModal();
      // Assert
      expect(component.showAddMemberModal).toBe(false);
    });

    it('does nothing when no org is selected', () => {
      // Arrange
      component.selectedOrg = null;

      // Act
      component.submitAddMember({ email: 'a@b.com', role: 'viewer' });

      // Assert
      expect(orgStub.addMember).not.toHaveBeenCalled();
    });

    it('adds a member, closes the modal and reloads members', () => {
      // Arrange
      component.showAddMemberModal = true;
      orgStub.listMembers.mockReturnValue(of([makeOrgMember()]));

      // Act
      component.submitAddMember({ email: 'new@b.com', role: 'editor' });

      // Assert
      expect(orgStub.addMember).toHaveBeenCalledWith('org-1', {
        email: 'new@b.com',
        role: 'editor',
      });
      expect(component.addingMember).toBe(false);
      expect(component.showAddMemberModal).toBe(false);
      expect(component.members.length).toBe(1);
    });

    it('surfaces an add-member error', () => {
      // Arrange
      orgStub.addMember.mockReturnValue(throwError(() => ({ error: { message: 'no such user' } })));

      // Act
      component.submitAddMember({ email: 'x@b.com', role: 'viewer' });

      // Assert
      expect(component.addMemberError).toBe('no such user');
      expect(component.addingMember).toBe(false);
    });
  });

  describe('changeMemberRole', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedOrg = makeOrganisation({ id: 'org-1' });
    });

    it('no-ops when the role is unchanged', () => {
      // Arrange
      const member = makeOrgMember({ role: 'editor' });

      // Act
      component.changeMemberRole(member, 'editor');

      // Assert
      expect(orgStub.updateMemberRole).not.toHaveBeenCalled();
    });

    it('updates the member role in place on success', () => {
      // Arrange
      const member = makeOrgMember({ userId: 'u1', role: 'editor' });
      orgStub.updateMemberRole.mockReturnValue(of(makeOrgMember({ role: 'org_admin' })));

      // Act
      component.changeMemberRole(member, 'org_admin');

      // Assert
      expect(orgStub.updateMemberRole).toHaveBeenCalledWith('org-1', 'u1', { role: 'org_admin' });
      expect(member.role).toBe('org_admin');
      expect(component.updatingMemberId).toBeNull();
    });

    it('surfaces an error when the role update fails', () => {
      // Arrange
      const member = makeOrgMember({ role: 'viewer' });
      orgStub.updateMemberRole.mockReturnValue(
        throwError(() => ({ error: { message: 'denied' } })),
      );

      // Act
      component.changeMemberRole(member, 'org_admin');

      // Assert
      expect(component.memberActionError).toBe('denied');
      expect(component.updatingMemberId).toBeNull();
    });
  });

  describe('remove member', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedOrg = makeOrganisation({ id: 'org-1' });
    });

    it('confirmRemoveMember opens the confirm modal with the member', () => {
      // Arrange
      const member = makeOrgMember();

      // Act
      component.confirmRemoveMember(member);

      // Assert
      expect(component.showRemoveConfirm).toBe(true);
      expect(component.removingMember).toBe(member);
    });

    it('cancelRemoveMember closes the modal and clears the member', () => {
      // Arrange
      component.showRemoveConfirm = true;
      component.removingMember = makeOrgMember();

      // Act
      component.cancelRemoveMember();

      // Assert
      expect(component.showRemoveConfirm).toBe(false);
      expect(component.removingMember).toBeNull();
    });

    it('executeRemoveMember no-ops without a pending member', () => {
      // Arrange
      component.removingMember = null;

      // Act
      component.executeRemoveMember();

      // Assert
      expect(orgStub.removeMember).not.toHaveBeenCalled();
    });

    it('removes the member, closes the modal and reloads members', () => {
      // Arrange
      component.removingMember = makeOrgMember({ userId: 'u1' });
      component.showRemoveConfirm = true;
      orgStub.listMembers.mockReturnValue(of([]));

      // Act
      component.executeRemoveMember();

      // Assert
      expect(orgStub.removeMember).toHaveBeenCalledWith('org-1', 'u1');
      expect(component.removingMemberId).toBeNull();
      expect(component.showRemoveConfirm).toBe(false);
      expect(component.removingMember).toBeNull();
      expect(component.members).toEqual([]);
    });

    it('surfaces an error and resets state on remove failure', () => {
      // Arrange
      component.removingMember = makeOrgMember({ userId: 'u1' });
      orgStub.removeMember.mockReturnValue(
        throwError(() => ({ error: { message: 'last admin' } })),
      );

      // Act
      component.executeRemoveMember();

      // Assert
      expect(component.memberActionError).toBe('last admin');
      expect(component.removingMemberId).toBeNull();
      expect(component.showRemoveConfirm).toBe(false);
      expect(component.removingMember).toBeNull();
    });
  });

  describe('helpers', () => {
    it('formatBytes formats sizes with unit scaling', () => {
      expect(component.formatBytes(0)).toBe('0 B');
      expect(component.formatBytes(1024)).toBe('1.0 KB');
      expect(component.formatBytes(1024 * 1024)).toBe('1.0 MB');
    });

    it('goBack navigates to the root route', () => {
      // Act
      component.goBack();

      // Assert
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
