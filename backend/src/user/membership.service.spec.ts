import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MembershipService } from './membership.service';
import { User } from './user.entity';
import { UserOrganisationMembership } from './user-organisation-membership.entity';
import { OrganisationRole } from './organisation-role.enum';

describe('MembershipService', () => {
  let service: MembershipService;
  let userRepo: jest.Mocked<Repository<User>>;
  let membershipRepo: jest.Mocked<Repository<UserOrganisationMembership>>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserOrganisationMembership),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
    userRepo = module.get(getRepositoryToken(User));
    membershipRepo = module.get(getRepositoryToken(UserOrganisationMembership));
  });

  describe('listMembers', () => {
    it('should return all memberships for an organisation', async () => {
      const memberships = [
        {
          id: 'm-1',
          userId: 'u-1',
          organisationId: orgId,
          role: OrganisationRole.OrgAdmin,
        },
        {
          id: 'm-2',
          userId: 'u-2',
          organisationId: orgId,
          role: OrganisationRole.Editor,
        },
      ] as UserOrganisationMembership[];
      membershipRepo.find.mockResolvedValue(memberships);

      const result = await service.listMembers(orgId);

      expect(membershipRepo.find).toHaveBeenCalledWith({
        where: { organisationId: orgId },
        relations: ['user'],
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('addMember', () => {
    it('should add an existing user as a member', async () => {
      const user = {
        id: 'u-1',
        email: 'test@example.com',
        name: 'Test',
      } as User;
      userRepo.findOne.mockResolvedValue(user);
      membershipRepo.findOne.mockResolvedValue(null);
      const membership = {
        id: 'm-1',
        userId: 'u-1',
        organisationId: orgId,
        role: OrganisationRole.Editor,
      } as UserOrganisationMembership;
      membershipRepo.create.mockReturnValue(membership);
      membershipRepo.save.mockResolvedValue(membership);

      const result = await service.addMember(
        orgId,
        'test@example.com',
        OrganisationRole.Editor,
      );

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(result.role).toBe(OrganisationRole.Editor);
      expect(result.user).toBe(user);
    });

    it('should create a placeholder user if user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const newUser = {
        id: 'generated-uuid',
        email: 'new@example.com',
        name: null,
      } as User;
      userRepo.create.mockReturnValue(newUser);
      userRepo.save.mockResolvedValue(newUser);
      membershipRepo.findOne.mockResolvedValue(null);
      const membership = {
        id: 'm-1',
        userId: 'generated-uuid',
        organisationId: orgId,
        role: OrganisationRole.Viewer,
      } as UserOrganisationMembership;
      membershipRepo.create.mockReturnValue(membership);
      membershipRepo.save.mockResolvedValue(membership);

      const result = await service.addMember(
        orgId,
        'new@example.com',
        OrganisationRole.Viewer,
      );

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com', name: null }),
      );
      expect(userRepo.save).toHaveBeenCalled();
      expect(result.user).toBe(newUser);
    });

    it('should throw ConflictException if user is already a member', async () => {
      const user = { id: 'u-1', email: 'test@example.com' } as User;
      userRepo.findOne.mockResolvedValue(user);
      membershipRepo.findOne.mockResolvedValue({
        id: 'm-1',
        userId: 'u-1',
        organisationId: orgId,
        role: OrganisationRole.Viewer,
      } as UserOrganisationMembership);

      await expect(
        service.addMember(orgId, 'test@example.com', OrganisationRole.Editor),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateRole', () => {
    it('should update the role of a member', async () => {
      const membership = {
        id: 'm-1',
        userId: 'u-1',
        organisationId: orgId,
        role: OrganisationRole.Viewer,
        user: { id: 'u-1', email: 'test@example.com' } as User,
      } as UserOrganisationMembership;
      membershipRepo.findOne.mockResolvedValue(membership);
      membershipRepo.save.mockResolvedValue({
        ...membership,
        role: OrganisationRole.Editor,
      } as UserOrganisationMembership);

      const result = await service.updateRole(
        orgId,
        'u-1',
        OrganisationRole.Editor,
      );

      expect(result.role).toBe(OrganisationRole.Editor);
    });

    it('should throw NotFoundException if membership does not exist', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateRole(orgId, 'u-999', OrganisationRole.Editor),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when demoting the last Org Admin', async () => {
      const membership = {
        id: 'm-1',
        userId: 'u-1',
        organisationId: orgId,
        role: OrganisationRole.OrgAdmin,
        user: { id: 'u-1', email: 'test@example.com' } as User,
      } as UserOrganisationMembership;
      membershipRepo.findOne.mockResolvedValue(membership);
      membershipRepo.count.mockResolvedValue(1);

      await expect(
        service.updateRole(orgId, 'u-1', OrganisationRole.Editor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow demoting an Org Admin when there are other admins', async () => {
      const membership = {
        id: 'm-1',
        userId: 'u-1',
        organisationId: orgId,
        role: OrganisationRole.OrgAdmin,
        user: { id: 'u-1', email: 'test@example.com' } as User,
      } as UserOrganisationMembership;
      membershipRepo.findOne.mockResolvedValue(membership);
      membershipRepo.count.mockResolvedValue(2);
      membershipRepo.save.mockResolvedValue({
        ...membership,
        role: OrganisationRole.Editor,
      } as UserOrganisationMembership);

      const result = await service.updateRole(
        orgId,
        'u-1',
        OrganisationRole.Editor,
      );

      expect(result.role).toBe(OrganisationRole.Editor);
    });

    it('should allow updating an Org Admin to the same role', async () => {
      const membership = {
        id: 'm-1',
        userId: 'u-1',
        organisationId: orgId,
        role: OrganisationRole.OrgAdmin,
        user: { id: 'u-1', email: 'test@example.com' } as User,
      } as UserOrganisationMembership;
      membershipRepo.findOne.mockResolvedValue(membership);
      membershipRepo.save.mockResolvedValue(membership);

      const result = await service.updateRole(
        orgId,
        'u-1',
        OrganisationRole.OrgAdmin,
      );

      expect(membershipRepo.count).not.toHaveBeenCalled();
      expect(result.role).toBe(OrganisationRole.OrgAdmin);
    });
  });

  describe('removeMember', () => {
    it('should remove a non-admin member', async () => {
      const membership = {
        id: 'm-1',
        userId: 'u-1',
        organisationId: orgId,
        role: OrganisationRole.Editor,
      } as UserOrganisationMembership;
      membershipRepo.findOne.mockResolvedValue(membership);
      membershipRepo.remove.mockResolvedValue(membership);

      await service.removeMember(orgId, 'u-1');

      expect(membershipRepo.remove).toHaveBeenCalledWith(membership);
    });

    it('should throw NotFoundException if membership does not exist', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(service.removeMember(orgId, 'u-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when removing the last Org Admin', async () => {
      const membership = {
        id: 'm-1',
        userId: 'u-1',
        organisationId: orgId,
        role: OrganisationRole.OrgAdmin,
      } as UserOrganisationMembership;
      membershipRepo.findOne.mockResolvedValue(membership);
      membershipRepo.count.mockResolvedValue(1);

      await expect(service.removeMember(orgId, 'u-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow removing an Org Admin when there are other admins', async () => {
      const membership = {
        id: 'm-1',
        userId: 'u-1',
        organisationId: orgId,
        role: OrganisationRole.OrgAdmin,
      } as UserOrganisationMembership;
      membershipRepo.findOne.mockResolvedValue(membership);
      membershipRepo.count.mockResolvedValue(2);
      membershipRepo.remove.mockResolvedValue(membership);

      await service.removeMember(orgId, 'u-1');

      expect(membershipRepo.remove).toHaveBeenCalledWith(membership);
    });
  });
});
