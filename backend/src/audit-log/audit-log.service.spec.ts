import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditEntry } from './audit-entry.entity';
import { AuditAction } from './audit-action.enum';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '660e8400-e29b-41d4-a716-446655440000';
  const resourceId = '770e8400-e29b-41d4-a716-446655440000';

  const mockEntry: AuditEntry = {
    id: '880e8400-e29b-41d4-a716-446655440000',
    timestamp: new Date('2026-03-30T10:00:00Z'),
    userId,
    organisationId: orgId,
    action: AuditAction.ContentUpload,
    resourceType: 'content',
    resourceId,
    details: { filename: 'poster.jpg', sizeBytes: 1024 },
    organisation: null,
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditEntry),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  describe('record', () => {
    it('should create and save an audit entry', async () => {
      const input = {
        userId,
        organisationId: orgId,
        action: AuditAction.ContentUpload,
        resourceType: 'content',
        resourceId,
        details: { filename: 'poster.jpg' },
        organisation: null,
      };

      repository.create.mockReturnValue(mockEntry);
      repository.save.mockResolvedValue(mockEntry);

      const result = await service.record(input);

      expect(repository.create).toHaveBeenCalledWith(input);
      expect(repository.save).toHaveBeenCalledWith(mockEntry);
      expect(result).toEqual(mockEntry);
    });

    it('should allow null userId for system actions', async () => {
      const systemEntry = {
        ...mockEntry,
        userId: null,
      };
      const input = {
        userId: null,
        organisationId: orgId,
        action: AuditAction.ScreenOffline,
        resourceType: 'screen',
        resourceId,
        details: null,
        organisation: null,
      };

      repository.create.mockReturnValue(systemEntry);
      repository.save.mockResolvedValue(systemEntry);

      const result = await service.record(input);

      expect(result.userId).toBeNull();
    });

    it('should allow null organisationId for super-admin actions', async () => {
      const superAdminEntry = {
        ...mockEntry,
        organisationId: null,
      };
      const input = {
        userId,
        organisationId: null,
        action: AuditAction.OrganisationCreated,
        resourceType: 'organisation',
        resourceId: orgId,
        details: { name: 'New Org' },
        organisation: null,
      };

      repository.create.mockReturnValue(superAdminEntry);
      repository.save.mockResolvedValue(superAdminEntry);

      const result = await service.record(input);

      expect(result.organisationId).toBeNull();
    });
  });

  describe('findByOrganisation', () => {
    it('should return entries scoped to an organisation', async () => {
      repository.findAndCount.mockResolvedValue([[mockEntry], 1]);

      const result = await service.findByOrganisation(orgId);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { organisationId: orgId },
        order: { timestamp: 'DESC' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual({ data: [mockEntry], total: 1 });
    });

    it('should apply action filter', async () => {
      repository.findAndCount.mockResolvedValue([[mockEntry], 1]);

      await service.findByOrganisation(orgId, {
        action: AuditAction.ContentUpload,
      });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organisationId: orgId,
            action: AuditAction.ContentUpload,
          },
        }),
      );
    });

    it('should apply userId filter', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findByOrganisation(orgId, { userId });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organisationId: orgId,
            userId,
          },
        }),
      );
    });

    it('should apply resourceType filter', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findByOrganisation(orgId, { resourceType: 'screen' });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organisationId: orgId,
            resourceType: 'screen',
          },
        }),
      );
    });

    it('should apply date range filter', async () => {
      const from = new Date('2026-03-01');
      const to = new Date('2026-03-31');

      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findByOrganisation(orgId, { from, to });

      const call = repository.findAndCount.mock.calls[0][0];
      expect(call.where.organisationId).toBe(orgId);
      expect(call.where.timestamp).toBeDefined();
    });

    it('should apply from-only date filter', async () => {
      const from = new Date('2026-03-01');

      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findByOrganisation(orgId, { from });

      const call = repository.findAndCount.mock.calls[0][0];
      expect(call.where.timestamp).toBeDefined();
    });

    it('should apply to-only date filter', async () => {
      const to = new Date('2026-03-31');

      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findByOrganisation(orgId, { to });

      const call = repository.findAndCount.mock.calls[0][0];
      expect(call.where.timestamp).toBeDefined();
    });

    it('should apply pagination', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findByOrganisation(orgId, { limit: 10, offset: 20 });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('should use default pagination values', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findByOrganisation(orgId);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all entries without organisation scope', async () => {
      repository.findAndCount.mockResolvedValue([[mockEntry], 1]);

      const result = await service.findAll();

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { timestamp: 'DESC' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual({ data: [mockEntry], total: 1 });
    });

    it('should apply filters to findAll', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        action: AuditAction.ScreenRegister,
        resourceType: 'screen',
        limit: 25,
        offset: 5,
      });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {
          action: AuditAction.ScreenRegister,
          resourceType: 'screen',
        },
        order: { timestamp: 'DESC' },
        take: 25,
        skip: 5,
      });
    });
  });
});
