import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { ScreenGroupService } from './screen-group.service';
import { ScreenGroupMode } from './screen-group-mode.enum';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screens, screenGroups, type ScreenGroup, type Screen } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

const MISSING_ID = '00000000-0000-0000-0000-000000000000';

describe('ScreenGroupService', () => {
  let service: ScreenGroupService;
  let db: DrizzleDB;
  let emit: jest.Mock;

  let orgId: string;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;

    emit = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenGroupService,
        { provide: DRIZZLE, useValue: db },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    service = module.get<ScreenGroupService>(ScreenGroupService);
  });

  async function seedGroup(overrides: Partial<ScreenGroup> = {}): Promise<ScreenGroup> {
    const [group] = await db
      .insert(screenGroups)
      .values({
        organisationId: orgId,
        name: 'Video Wall',
        mode: ScreenGroupMode.Split,
        gridColumns: 2,
        gridRows: 2,
        ...overrides,
      })
      .returning();
    return group;
  }

  async function seedScreen(overrides: Partial<Screen> = {}): Promise<Screen> {
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name: 'Lobby Display',
        resolution: '1920x1080',
        location: 'Lobby',
        apiKeyHash: 'hash',
        ...overrides,
      })
      .returning();
    return screen;
  }

  describe('createGroup', () => {
    it('should create a split-mode group with grid dimensions', async () => {
      const result = await service.createGroup(orgId, {
        name: 'Video Wall',
        mode: ScreenGroupMode.Split,
        gridColumns: 2,
        gridRows: 2,
      });

      expect(result.name).toBe('Video Wall');
      expect(result.mode).toBe(ScreenGroupMode.Split);
      expect(result.gridColumns).toBe(2);
      expect(result.gridRows).toBe(2);
      expect(result.organisationId).toBe(orgId);
    });

    it('should create a mirror-mode group without grid dimensions', async () => {
      const result = await service.createGroup(orgId, {
        name: 'Mirror Group',
        mode: ScreenGroupMode.Mirror,
      });

      expect(result.mode).toBe(ScreenGroupMode.Mirror);
      expect(result.gridColumns).toBeNull();
      expect(result.gridRows).toBeNull();
    });

    it('should throw BadRequestException when split mode lacks gridColumns', async () => {
      await expect(
        service.createGroup(orgId, {
          name: 'Bad Wall',
          mode: ScreenGroupMode.Split,
          gridRows: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when split mode lacks gridRows', async () => {
      await expect(
        service.createGroup(orgId, {
          name: 'Bad Wall',
          mode: ScreenGroupMode.Split,
          gridColumns: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should null out grid dimensions for mirror mode even if provided', async () => {
      const result = await service.createGroup(orgId, {
        name: 'Mirror',
        mode: ScreenGroupMode.Mirror,
        gridColumns: 2,
        gridRows: 2,
      });

      expect(result.gridColumns).toBeNull();
      expect(result.gridRows).toBeNull();
    });

    it('should default color and icon when not provided', async () => {
      const result = await service.createGroup(orgId, {
        name: 'Defaults',
        mode: ScreenGroupMode.Mirror,
      });

      expect(result.color).toBe('#6d6cf6');
      expect(result.icon).toBe('Groups');
    });

    it('should persist provided color and icon', async () => {
      const result = await service.createGroup(orgId, {
        name: 'Custom',
        mode: ScreenGroupMode.Mirror,
        color: '#0ea5e9',
        icon: 'Cast',
      });

      expect(result.color).toBe('#0ea5e9');
      expect(result.icon).toBe('Cast');
    });
  });

  describe('findAll', () => {
    it('should return all groups for the organisation with screens', async () => {
      const group = await seedGroup();
      await seedScreen({ groupId: group.id });

      const result = await service.findAll(orgId);

      expect(result).toHaveLength(1);
      expect(result[0].screens).toHaveLength(1);
    });

    it("sorts each group's screens by name with numbers in numeric order", async () => {
      const group = await seedGroup();
      for (const name of ['Wall 10', 'Wall 2', 'Wall 1']) {
        await seedScreen({ groupId: group.id, name });
      }

      const [result] = await service.findAll(orgId);

      expect(result.screens.map((s) => s.name)).toEqual(['Wall 1', 'Wall 2', 'Wall 10']);
    });

    it('sorts groups by name with numbers in numeric order', async () => {
      for (const name of ['Gruppe 10', 'Gruppe 2', 'Bühne']) {
        await seedGroup({ name });
      }

      const result = await service.findAll(orgId);

      expect(result.map((g) => g.name)).toEqual(['Bühne', 'Gruppe 2', 'Gruppe 10']);
    });

    it('should return empty array when no groups exist', async () => {
      const result = await service.findAll(orgId);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a group by id scoped to organisation', async () => {
      const group = await seedGroup();

      const result = await service.findOne(orgId, group.id);

      expect(result.id).toBe(group.id);
      expect(result.screens).toEqual([]);
    });

    it("sorts the group's screens by name with numbers in numeric order", async () => {
      const group = await seedGroup();
      for (const name of ['Wall 10', 'Wall 2', 'Wall 1']) {
        await seedScreen({ groupId: group.id, name });
      }

      const result = await service.findOne(orgId, group.id);

      expect(result.screens.map((s) => s.name)).toEqual(['Wall 1', 'Wall 2', 'Wall 10']);
    });

    it('should throw NotFoundException when group not found', async () => {
      await expect(service.findOne(orgId, MISSING_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateGroup', () => {
    it('should update the group name', async () => {
      const group = await seedGroup();

      const result = await service.updateGroup(orgId, group.id, { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('should switch from split to mirror and clear grid dimensions', async () => {
      const group = await seedGroup();

      const result = await service.updateGroup(orgId, group.id, {
        mode: ScreenGroupMode.Mirror,
      });

      expect(result.mode).toBe(ScreenGroupMode.Mirror);
      expect(result.gridColumns).toBeNull();
      expect(result.gridRows).toBeNull();
    });

    it('should switch from mirror to split with grid dimensions', async () => {
      const group = await seedGroup({
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      });

      const result = await service.updateGroup(orgId, group.id, {
        mode: ScreenGroupMode.Split,
        gridColumns: 3,
        gridRows: 2,
      });

      expect(result.mode).toBe(ScreenGroupMode.Split);
      expect(result.gridColumns).toBe(3);
      expect(result.gridRows).toBe(2);
    });

    it('should throw BadRequestException when switching to split without grid', async () => {
      const group = await seedGroup({
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      });

      await expect(
        service.updateGroup(orgId, group.id, { mode: ScreenGroupMode.Split }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when group not found', async () => {
      await expect(service.updateGroup(orgId, MISSING_ID, { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update color and icon', async () => {
      const group = await seedGroup();

      const result = await service.updateGroup(orgId, group.id, {
        color: '#ec4899',
        icon: 'Layers',
      });

      expect(result.color).toBe('#ec4899');
      expect(result.icon).toBe('Layers');
    });
  });

  describe('removeGroup', () => {
    it('should remove a group with no member screens', async () => {
      const group = await seedGroup();

      await service.removeGroup(orgId, group.id);

      const rows = await db.select().from(screenGroups).where(eq(screenGroups.id, group.id));
      expect(rows).toHaveLength(0);
    });

    it('should throw ConflictException when group has member screens', async () => {
      const group = await seedGroup();
      await seedScreen({ groupId: group.id });
      await seedScreen({ groupId: group.id });
      await seedScreen({ groupId: group.id });

      await expect(service.removeGroup(orgId, group.id)).rejects.toThrow(ConflictException);
    });

    it('should include screen count in conflict message', async () => {
      const group = await seedGroup();
      await seedScreen({ groupId: group.id });
      await seedScreen({ groupId: group.id });

      await expect(service.removeGroup(orgId, group.id)).rejects.toThrow(/2 assigned screen\(s\)/);
    });

    it('should throw NotFoundException when group not found', async () => {
      await expect(service.removeGroup(orgId, MISSING_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignScreen', () => {
    it('should assign a screen to a mirror-mode group', async () => {
      const group = await seedGroup({
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      });
      const screen = await seedScreen();

      const result = await service.assignScreen(orgId, group.id, screen.id, {});

      expect(result.groupId).toBe(group.id);
      expect(result.gridRow).toBeNull();
      expect(result.gridColumn).toBeNull();
    });

    it('should assign a screen to a split-mode group with grid position', async () => {
      const group = await seedGroup();
      const screen = await seedScreen();

      const result = await service.assignScreen(orgId, group.id, screen.id, {
        gridRow: 0,
        gridColumn: 1,
      });

      expect(result.groupId).toBe(group.id);
      expect(result.gridRow).toBe(0);
      expect(result.gridColumn).toBe(1);
    });

    it('should throw NotFoundException when screen not found', async () => {
      const group = await seedGroup({
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      });

      await expect(service.assignScreen(orgId, group.id, MISSING_ID, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when screen belongs to another group', async () => {
      const group = await seedGroup({
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      });
      const otherGroup = await seedGroup();
      const screen = await seedScreen({ groupId: otherGroup.id });

      await expect(service.assignScreen(orgId, group.id, screen.id, {})).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException when split-mode group lacks grid position', async () => {
      const group = await seedGroup();
      const screen = await seedScreen();

      await expect(service.assignScreen(orgId, group.id, screen.id, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when grid cell is already occupied', async () => {
      const group = await seedGroup();
      await seedScreen({ groupId: group.id, gridRow: 0, gridColumn: 0, name: 'Occupier' });
      const screen = await seedScreen();

      await expect(
        service.assignScreen(orgId, group.id, screen.id, { gridRow: 0, gridColumn: 0 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow re-assigning a screen to the same group (idempotent)', async () => {
      const group = await seedGroup();
      const screen = await seedScreen({ groupId: group.id, gridRow: 0, gridColumn: 0 });

      const result = await service.assignScreen(orgId, group.id, screen.id, {
        gridRow: 1,
        gridColumn: 0,
      });

      expect(result.groupId).toBe(group.id);
      expect(result.gridRow).toBe(1);
    });

    it('should throw NotFoundException when group not found', async () => {
      const screen = await seedScreen();
      await expect(service.assignScreen(orgId, MISSING_ID, screen.id, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeScreen', () => {
    it('should remove a screen from the group and clear grid position', async () => {
      const group = await seedGroup();
      const screen = await seedScreen({ groupId: group.id, gridRow: 0, gridColumn: 1 });

      const result = await service.removeScreen(orgId, group.id, screen.id);

      expect(result.groupId).toBeNull();
      expect(result.gridRow).toBeNull();
      expect(result.gridColumn).toBeNull();
    });

    it('should throw NotFoundException when screen not in group', async () => {
      const group = await seedGroup();
      const screen = await seedScreen();

      await expect(service.removeScreen(orgId, group.id, screen.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when group not found', async () => {
      await expect(service.removeScreen(orgId, MISSING_ID, MISSING_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject cross-org removal (screen in different org)', async () => {
      const [otherOrg] = await db
        .insert(organisations)
        .values({ name: `Other ${Math.random()}`, timeZone: 'UTC' })
        .returning();
      const group = await seedGroup();
      const screen = await seedScreen({ groupId: group.id });

      // Group is not found when scoped to the wrong org.
      await expect(service.removeScreen(otherOrg.id, group.id, screen.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignScreen — cross-org rejection', () => {
    it('should reject assignment when group belongs to a different organisation', async () => {
      const [otherOrg] = await db
        .insert(organisations)
        .values({ name: `Other ${Math.random()}`, timeZone: 'UTC' })
        .returning();
      const group = await seedGroup();
      const screen = await seedScreen();

      await expect(service.assignScreen(otherOrg.id, group.id, screen.id, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('audit events', () => {
    it('should emit audit event on group creation', async () => {
      const result = await service.createGroup(
        orgId,
        { name: 'Audit Test', mode: ScreenGroupMode.Mirror },
        'user-1',
      );

      expect(emit).toHaveBeenCalledWith(
        'audit.group.created',
        expect.objectContaining({
          groupId: result.id,
          organisationId: orgId,
          userId: 'user-1',
        }),
      );
    });

    it('should emit mode_changed event when mode changes', async () => {
      const group = await seedGroup({ mode: ScreenGroupMode.Split });

      await service.updateGroup(orgId, group.id, { mode: ScreenGroupMode.Mirror }, 'user-1');

      expect(emit).toHaveBeenCalledWith(
        'audit.group.mode_changed',
        expect.objectContaining({
          groupId: group.id,
          details: expect.objectContaining({
            previousMode: ScreenGroupMode.Split,
            newMode: ScreenGroupMode.Mirror,
          }),
        }),
      );
    });

    it('should emit audit event on group deletion', async () => {
      const group = await seedGroup();

      await service.removeGroup(orgId, group.id, 'user-1');

      expect(emit).toHaveBeenCalledWith(
        'audit.group.deleted',
        expect.objectContaining({ groupId: group.id, organisationId: orgId }),
      );
    });

    it('should emit audit event on screen assignment', async () => {
      const group = await seedGroup({
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      });
      const screen = await seedScreen();

      await service.assignScreen(orgId, group.id, screen.id, {}, 'user-1');

      expect(emit).toHaveBeenCalledWith(
        'audit.group.screen_added',
        expect.objectContaining({
          groupId: group.id,
          details: expect.objectContaining({ screenId: screen.id }),
        }),
      );
    });

    it('should emit audit event on screen removal', async () => {
      const group = await seedGroup();
      const screen = await seedScreen({ groupId: group.id, gridRow: 0, gridColumn: 0 });

      await service.removeScreen(orgId, group.id, screen.id, 'user-1');

      expect(emit).toHaveBeenCalledWith(
        'audit.group.screen_removed',
        expect.objectContaining({
          groupId: group.id,
          details: expect.objectContaining({ screenId: screen.id }),
        }),
      );
    });
  });
});
