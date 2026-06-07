import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditLogController, AdminAuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from './audit-action.enum';
import { AuditEntry } from './audit-entry.entity';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let service: Record<string, jest.Mock>;

  const mockEntry: AuditEntry = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    timestamp: new Date('2026-03-30T10:00:00Z'),
    userId: '550e8400-e29b-41d4-a716-446655440002',
    organisationId: '550e8400-e29b-41d4-a716-446655440000',
    organisation: null,
    action: AuditAction.ContentUpload,
    resourceType: 'content',
    resourceId: '550e8400-e29b-41d4-a716-446655440003',
    details: { filename: 'test.mp4' },
  };

  beforeEach(async () => {
    service = {
      findByOrganisation: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [{ provide: AuditLogService, useValue: service }],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
  });

  describe('findByOrganisation', () => {
    it('should return paginated entries for the organisation', async () => {
      const result = { data: [mockEntry], total: 1 };
      service.findByOrganisation.mockResolvedValue(result);

      const response = await controller.findByOrganisation(mockEntry.organisationId!, {});

      expect(service.findByOrganisation).toHaveBeenCalledWith(mockEntry.organisationId, {
        limit: 50,
        offset: 0,
      });
      expect(response).toEqual(result);
    });

    it('should pass filter parameters to the service', async () => {
      const result = { data: [], total: 0 };
      service.findByOrganisation.mockResolvedValue(result);

      await controller.findByOrganisation(mockEntry.organisationId!, {
        action: AuditAction.ContentUpload,
        userId: mockEntry.userId!,
        resourceType: 'content',
        from: '2026-03-01T00:00:00Z',
        to: '2026-03-31T23:59:59Z',
        limit: '20',
        offset: '10',
      });

      expect(service.findByOrganisation).toHaveBeenCalledWith(mockEntry.organisationId, {
        action: AuditAction.ContentUpload,
        userId: mockEntry.userId,
        resourceType: 'content',
        from: new Date('2026-03-01T00:00:00Z'),
        to: new Date('2026-03-31T23:59:59Z'),
        limit: 20,
        offset: 10,
      });
    });

    it('should cap limit at 200', async () => {
      service.findByOrganisation.mockResolvedValue({ data: [], total: 0 });

      await controller.findByOrganisation(mockEntry.organisationId!, {
        limit: '500',
      });

      expect(service.findByOrganisation).toHaveBeenCalledWith(
        mockEntry.organisationId,
        expect.objectContaining({ limit: 200 }),
      );
    });

    it('should default limit to 50 and offset to 0', async () => {
      service.findByOrganisation.mockResolvedValue({ data: [], total: 0 });

      await controller.findByOrganisation(mockEntry.organisationId!, {});

      expect(service.findByOrganisation).toHaveBeenCalledWith(
        mockEntry.organisationId,
        expect.objectContaining({ limit: 50, offset: 0 }),
      );
    });
  });
});

describe('AdminAuditLogController', () => {
  let controller: AdminAuditLogController;
  let service: Record<string, jest.Mock>;

  const mockEntry: AuditEntry = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    timestamp: new Date('2026-03-30T10:00:00Z'),
    userId: '550e8400-e29b-41d4-a716-446655440002',
    organisationId: '550e8400-e29b-41d4-a716-446655440000',
    organisation: null,
    action: AuditAction.ContentUpload,
    resourceType: 'content',
    resourceId: '550e8400-e29b-41d4-a716-446655440003',
    details: { filename: 'test.mp4' },
  };

  beforeEach(async () => {
    service = {
      findByOrganisation: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuditLogController],
      providers: [
        { provide: AuditLogService, useValue: service },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('admin-1') },
        },
      ],
    }).compile();

    controller = module.get<AdminAuditLogController>(AdminAuditLogController);
  });

  describe('findAll', () => {
    it('should return all entries across organisations', async () => {
      const result = { data: [mockEntry], total: 1 };
      service.findAll.mockResolvedValue(result);

      const response = await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
      });
      expect(response).toEqual(result);
    });

    it('should scope to organisation when organisationId is provided', async () => {
      const result = { data: [mockEntry], total: 1 };
      service.findByOrganisation.mockResolvedValue(result);

      await controller.findAll({
        organisationId: mockEntry.organisationId!,
      });

      expect(service.findByOrganisation).toHaveBeenCalledWith(
        mockEntry.organisationId,
        expect.objectContaining({ limit: 50, offset: 0 }),
      );
      expect(service.findAll).not.toHaveBeenCalled();
    });

    it('should pass filter parameters to the service', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll({
        action: AuditAction.UserInvited,
        resourceType: 'user',
        limit: '100',
        offset: '50',
      });

      expect(service.findAll).toHaveBeenCalledWith({
        action: AuditAction.UserInvited,
        resourceType: 'user',
        limit: 100,
        offset: 50,
      });
    });

    it('should cap limit at 200', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll({ limit: '999' });

      expect(service.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 200 }));
    });
  });
});
