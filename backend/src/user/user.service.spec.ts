import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from './user.entity';
import { UserOrganisationMembership } from './user-organisation-membership.entity';
import { OrganisationRole } from './organisation-role.enum';

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<Repository<User>>;
  let membershipRepo: jest.Mocked<Repository<UserOrganisationMembership>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
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
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get(getRepositoryToken(User));
    membershipRepo = module.get(getRepositoryToken(UserOrganisationMembership));
  });

  describe('findOrCreate', () => {
    it('should return existing user if found', async () => {
      const existing = {
        id: 'user-1',
        email: 'test@example.com',
        name: null,
      } as User;
      userRepo.findOne.mockResolvedValue(existing);

      const result = await service.findOrCreate('user-1', 'test@example.com');

      expect(result).toBe(existing);
      expect(userRepo.create).not.toHaveBeenCalled();
    });

    it('should update email if it changed', async () => {
      const existing = {
        id: 'user-1',
        email: 'old@example.com',
        name: null,
      } as User;
      userRepo.findOne.mockResolvedValue(existing);
      userRepo.save.mockResolvedValue({
        ...existing,
        email: 'new@example.com',
      } as User);

      const result = await service.findOrCreate('user-1', 'new@example.com');

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      );
      expect(result.email).toBe('new@example.com');
    });

    it('should create a new user if not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const newUser = {
        id: 'user-2',
        email: 'new@example.com',
        name: null,
      } as User;
      userRepo.create.mockReturnValue(newUser);
      userRepo.save.mockResolvedValue(newUser);

      const result = await service.findOrCreate('user-2', 'new@example.com');

      expect(userRepo.create).toHaveBeenCalledWith({
        id: 'user-2',
        email: 'new@example.com',
        name: null,
      });
      expect(userRepo.save).toHaveBeenCalledWith(newUser);
      expect(result).toBe(newUser);
    });
  });

  describe('getMemberships', () => {
    it('should return all memberships for a user', async () => {
      const memberships = [
        {
          id: 'm-1',
          userId: 'user-1',
          organisationId: 'org-1',
          role: OrganisationRole.OrgAdmin,
        },
        {
          id: 'm-2',
          userId: 'user-1',
          organisationId: 'org-2',
          role: OrganisationRole.Viewer,
        },
      ] as UserOrganisationMembership[];
      membershipRepo.find.mockResolvedValue(memberships);

      const result = await service.getMemberships('user-1');

      expect(membershipRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['organisation'],
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('getMembership', () => {
    it('should return the membership for a specific user and org', async () => {
      const membership = {
        id: 'm-1',
        userId: 'user-1',
        organisationId: 'org-1',
        role: OrganisationRole.Editor,
      } as UserOrganisationMembership;
      membershipRepo.findOne.mockResolvedValue(membership);

      const result = await service.getMembership('user-1', 'org-1');

      expect(membershipRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', organisationId: 'org-1' },
      });
      expect(result).toBe(membership);
    });

    it('should return null when no membership exists', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      const result = await service.getMembership('user-1', 'org-99');

      expect(result).toBeNull();
    });
  });
});
