import { Test, TestingModule } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from './audit-action.enum';
import { DRIZZLE } from '../db/database.constants';
import { auditEntries, organisations, type AuditEntry, type Organisation } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

const USER_ID = '660e8400-e29b-41d4-a716-446655440000';
const RESOURCE_ID = '770e8400-e29b-41d4-a716-446655440000';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let db: DrizzleDB;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService, { provide: DRIZZLE, useValue: db }],
    }).compile();
    service = module.get<AuditLogService>(AuditLogService);
  });

  async function seedOrg(overrides: Partial<Organisation> = {}): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC', ...overrides })
      .returning();
    return org;
  }

  async function seedEntry(
    values: Partial<AuditEntry> & { action: AuditAction },
  ): Promise<AuditEntry> {
    const [entry] = await db
      .insert(auditEntries)
      .values({
        resourceType: 'content',
        ...values,
      })
      .returning();
    return entry;
  }

  describe('record', () => {
    it('persists an audit entry and returns it', async () => {
      const org = await seedOrg();
      const result = await service.record({
        userId: USER_ID,
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        resourceType: 'content',
        resourceId: RESOURCE_ID,
        details: { filename: 'poster.jpg', sizeBytes: 1024 },
      });

      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      const [row] = await db.select().from(auditEntries).where(eq(auditEntries.id, result.id));
      expect(row.action).toBe(AuditAction.ContentUpload);
      expect(row.userId).toBe(USER_ID);
      expect(row.organisationId).toBe(org.id);
      expect(row.details).toEqual({ filename: 'poster.jpg', sizeBytes: 1024 });
    });

    it('allows null userId for system actions', async () => {
      const org = await seedOrg();
      const result = await service.record({
        userId: null,
        organisationId: org.id,
        action: AuditAction.ScreenOffline,
        resourceType: 'screen',
        resourceId: RESOURCE_ID,
        details: null,
      });

      expect(result.userId).toBeNull();
    });

    it('allows null organisationId for super-admin actions', async () => {
      const result = await service.record({
        userId: USER_ID,
        organisationId: null,
        action: AuditAction.OrganisationCreated,
        resourceType: 'organisation',
        resourceId: RESOURCE_ID,
        details: { name: 'New Org' },
      });

      expect(result.organisationId).toBeNull();
    });
  });

  describe('findByOrganisation', () => {
    it('returns entries scoped to an organisation', async () => {
      const org = await seedOrg();
      const other = await seedOrg();
      await seedEntry({ organisationId: org.id, action: AuditAction.ContentUpload });
      await seedEntry({ organisationId: other.id, action: AuditAction.ContentUpload });

      const result = await service.findByOrganisation(org.id);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].organisationId).toBe(org.id);
    });

    it('orders entries by timestamp descending', async () => {
      const org = await seedOrg();
      const older = await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        timestamp: new Date('2026-01-01T00:00:00Z'),
      });
      const newer = await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentDelete,
        timestamp: new Date('2026-02-01T00:00:00Z'),
      });

      const result = await service.findByOrganisation(org.id);

      expect(result.data.map((e) => e.id)).toEqual([newer.id, older.id]);
    });

    it('applies the action filter', async () => {
      const org = await seedOrg();
      await seedEntry({ organisationId: org.id, action: AuditAction.ContentUpload });
      await seedEntry({ organisationId: org.id, action: AuditAction.ContentDelete });

      const result = await service.findByOrganisation(org.id, {
        action: AuditAction.ContentUpload,
      });

      expect(result.total).toBe(1);
      expect(result.data[0].action).toBe(AuditAction.ContentUpload);
    });

    it('applies the userId filter', async () => {
      const org = await seedOrg();
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        userId: USER_ID,
      });
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        userId: 'other-user',
      });

      const result = await service.findByOrganisation(org.id, { userId: USER_ID });

      expect(result.total).toBe(1);
      expect(result.data[0].userId).toBe(USER_ID);
    });

    it('applies the resourceType filter', async () => {
      const org = await seedOrg();
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ScreenRegister,
        resourceType: 'screen',
      });
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        resourceType: 'content',
      });

      const result = await service.findByOrganisation(org.id, { resourceType: 'screen' });

      expect(result.total).toBe(1);
      expect(result.data[0].resourceType).toBe('screen');
    });

    it('applies a from/to date range filter', async () => {
      const org = await seedOrg();
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        timestamp: new Date('2026-02-15T00:00:00Z'),
      });
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        timestamp: new Date('2026-05-15T00:00:00Z'),
      });

      const result = await service.findByOrganisation(org.id, {
        from: new Date('2026-03-01T00:00:00Z'),
        to: new Date('2026-03-31T00:00:00Z'),
      });

      expect(result.total).toBe(0);
    });

    it('applies a from-only date filter', async () => {
      const org = await seedOrg();
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        timestamp: new Date('2026-01-01T00:00:00Z'),
      });
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        timestamp: new Date('2026-06-01T00:00:00Z'),
      });

      const result = await service.findByOrganisation(org.id, {
        from: new Date('2026-03-01T00:00:00Z'),
      });

      expect(result.total).toBe(1);
    });

    it('applies a to-only date filter', async () => {
      const org = await seedOrg();
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        timestamp: new Date('2026-01-01T00:00:00Z'),
      });
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        timestamp: new Date('2026-06-01T00:00:00Z'),
      });

      const result = await service.findByOrganisation(org.id, {
        to: new Date('2026-03-01T00:00:00Z'),
      });

      expect(result.total).toBe(1);
    });

    it('applies pagination (limit/offset) while reporting the full total', async () => {
      const org = await seedOrg();
      for (let i = 0; i < 5; i += 1) {
        await seedEntry({
          organisationId: org.id,
          action: AuditAction.ContentUpload,
          timestamp: new Date(`2026-01-0${i + 1}T00:00:00Z`),
        });
      }

      const result = await service.findByOrganisation(org.id, { limit: 2, offset: 1 });

      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(2);
    });

    it('uses default pagination values', async () => {
      const org = await seedOrg();
      for (let i = 0; i < 60; i += 1) {
        await seedEntry({ organisationId: org.id, action: AuditAction.ContentUpload });
      }

      const result = await service.findByOrganisation(org.id);

      expect(result.total).toBe(60);
      expect(result.data).toHaveLength(50);
    });
  });

  describe('findAll', () => {
    it('returns entries across all organisations', async () => {
      const org = await seedOrg();
      const other = await seedOrg();
      await seedEntry({ organisationId: org.id, action: AuditAction.ContentUpload });
      await seedEntry({ organisationId: other.id, action: AuditAction.ContentUpload });

      const result = await service.findAll();

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('applies filters to findAll', async () => {
      const org = await seedOrg();
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ScreenRegister,
        resourceType: 'screen',
      });
      await seedEntry({
        organisationId: org.id,
        action: AuditAction.ContentUpload,
        resourceType: 'content',
      });

      const result = await service.findAll({
        action: AuditAction.ScreenRegister,
        resourceType: 'screen',
        limit: 25,
        offset: 0,
      });

      expect(result.total).toBe(1);
      expect(result.data[0].action).toBe(AuditAction.ScreenRegister);
      const matching = await db
        .select()
        .from(auditEntries)
        .where(
          and(
            eq(auditEntries.action, AuditAction.ScreenRegister),
            eq(auditEntries.resourceType, 'screen'),
          ),
        );
      expect(matching).toHaveLength(1);
    });
  });
});
