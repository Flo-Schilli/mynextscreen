import { NotFoundException } from '@nestjs/common';
import {
  OrganisationScopedService,
  OrganisationScoped,
} from './organisation-scope.service';

interface TestEntity extends OrganisationScoped {
  id: string;
  organisationId: string;
  name: string;
}

describe('OrganisationScopedService', () => {
  let service: OrganisationScopedService<TestEntity>;
  let repository: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const otherOrgId = '660e8400-e29b-41d4-a716-446655440000';
  const entityId = '770e8400-e29b-41d4-a716-446655440000';

  const mockEntity: TestEntity = {
    id: entityId,
    organisationId: orgId,
    name: 'Test Entity',
  };

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    service = new OrganisationScopedService(
      repository as unknown as import('typeorm').Repository<TestEntity>,
      'TestEntity',
    );
  });

  describe('findAll', () => {
    it('should scope queries by organisationId', async () => {
      repository.find.mockResolvedValue([mockEntity]);

      const result = await service.findAll(orgId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { organisationId: orgId },
      });
      expect(result).toEqual([mockEntity]);
    });

    it('should return empty array for organisation with no entities', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll(otherOrgId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { organisationId: otherOrgId },
      });
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should scope single-entity query by organisationId and id', async () => {
      repository.findOne.mockResolvedValue(mockEntity);

      const result = await service.findOne(orgId, entityId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { organisationId: orgId, id: entityId },
      });
      expect(result).toEqual(mockEntity);
    });

    it('should throw NotFoundException when entity not found in organisation', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(otherOrgId, entityId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(otherOrgId, entityId)).rejects.toThrow(
        `TestEntity with id "${entityId}" not found in organisation "${otherOrgId}"`,
      );
    });
  });

  describe('create', () => {
    it('should set organisationId on the created entity', async () => {
      const data = { name: 'New Entity' };
      const created = { ...mockEntity, name: 'New Entity' };
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.create(orgId, data);

      expect(repository.create).toHaveBeenCalledWith({
        ...data,
        organisationId: orgId,
      });
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update an entity scoped to the organisation', async () => {
      const data = { name: 'Updated' };
      const updated = { ...mockEntity, name: 'Updated' };
      repository.findOne.mockResolvedValue({ ...mockEntity });
      repository.save.mockResolvedValue(updated);

      const result = await service.update(orgId, entityId, data);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { organisationId: orgId, id: entityId },
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when entity not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(otherOrgId, entityId, { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an entity scoped to the organisation', async () => {
      repository.findOne.mockResolvedValue(mockEntity);
      repository.remove.mockResolvedValue(mockEntity);

      await service.remove(orgId, entityId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { organisationId: orgId, id: entityId },
      });
      expect(repository.remove).toHaveBeenCalledWith(mockEntity);
    });

    it('should throw NotFoundException when entity not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(otherOrgId, entityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
