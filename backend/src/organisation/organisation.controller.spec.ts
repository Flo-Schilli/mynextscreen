import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrganisationController } from './organisation.controller';
import { OrganisationService } from './organisation.service';
import { MembershipService } from '../user/membership.service';
import { Organisation } from './organisation.entity';

describe('OrganisationController', () => {
  let controller: OrganisationController;
  let service: Record<string, jest.Mock>;

  const mockOrganisation: Organisation = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Org',
    timeZone: 'Europe/Vienna',
    storageOriginalLimitBytes: 1073741824,
    storageTranscodedLimitBytes: 2147483648,
    storageOriginalUsedBytes: 0,
    storageTranscodedUsedBytes: 0,
    defaultPlaylistId: null,
    defaultPlaylist: null as unknown,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMembershipService = {
    listMembers: jest.fn(),
    addMember: jest.fn(),
    updateRole: jest.fn(),
    removeMember: jest.fn(),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganisationController],
      providers: [
        { provide: OrganisationService, useValue: service },
        { provide: MembershipService, useValue: mockMembershipService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('admin-1') },
        },
      ],
    }).compile();

    controller = module.get<OrganisationController>(OrganisationController);
  });

  describe('create', () => {
    it('should create an organisation', async () => {
      const dto = {
        name: 'Test Org',
        timeZone: 'Europe/Vienna',
        storageOriginalLimitBytes: 1073741824,
        storageTranscodedLimitBytes: 2147483648,
      };
      service.create.mockResolvedValue(mockOrganisation);

      const mockReq = { user: { userId: 'user-1', email: 'admin@test.com' } } as any;
      const result = await controller.create(dto, mockReq);

      expect(service.create).toHaveBeenCalledWith(dto, mockReq.user);
      expect(result).toEqual(mockOrganisation);
    });
  });

  describe('findAll', () => {
    it('should return all organisations', async () => {
      service.findAll.mockResolvedValue([mockOrganisation]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockOrganisation]);
    });
  });

  describe('findOne', () => {
    it('should return an organisation by id', async () => {
      service.findOne.mockResolvedValue(mockOrganisation);

      const result = await controller.findOne(mockOrganisation.id);

      expect(service.findOne).toHaveBeenCalledWith(mockOrganisation.id);
      expect(result).toEqual(mockOrganisation);
    });
  });

  describe('update', () => {
    it('should update an organisation', async () => {
      const dto = { name: 'Updated Org' };
      const updated = { ...mockOrganisation, name: 'Updated Org' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(mockOrganisation.id, dto);

      expect(service.update).toHaveBeenCalledWith(mockOrganisation.id, dto);
      expect(result).toEqual(updated);
    });
  });
});
