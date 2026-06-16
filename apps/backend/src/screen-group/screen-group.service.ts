import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screens, screenGroups, type Screen, type ScreenGroup } from '../db/schema';
import { ScreenGroupMode } from './screen-group-mode.enum';
import { CreateScreenGroupDto } from './dto/create-screen-group.dto';
import { UpdateScreenGroupDto } from './dto/update-screen-group.dto';
import { AssignScreenDto } from './dto/assign-screen.dto';
import {
  AUDIT_GROUP_CREATED,
  AUDIT_GROUP_UPDATED,
  AUDIT_GROUP_DELETED,
  AUDIT_GROUP_SCREEN_ADDED,
  AUDIT_GROUP_SCREEN_REMOVED,
  AUDIT_GROUP_MODE_CHANGED,
  AuditGroupEvent,
} from '../audit-log/audit.events';

type ScreenGroupWithScreens = ScreenGroup & { screens: Screen[] };

@Injectable()
export class ScreenGroupService extends OrganisationScopedService<ScreenGroup> {
  constructor(
    @Inject(DRIZZLE) db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(db, screenGroups, 'ScreenGroup');
  }

  override async findAll(organisationId: string): Promise<ScreenGroupWithScreens[]> {
    return this.db.query.screenGroups.findMany({
      where: eq(screenGroups.organisationId, organisationId),
      with: { screens: true },
    });
  }

  override async findOne(organisationId: string, id: string): Promise<ScreenGroupWithScreens> {
    const entity = await this.db.query.screenGroups.findFirst({
      where: and(eq(screenGroups.id, id), eq(screenGroups.organisationId, organisationId)),
      with: { screens: true },
    });
    if (!entity) {
      throw new NotFoundException(
        `ScreenGroup with id "${id}" not found in organisation "${organisationId}"`,
      );
    }
    return entity;
  }

  async createGroup(
    organisationId: string,
    dto: CreateScreenGroupDto,
    userId: string | null = null,
  ): Promise<ScreenGroup> {
    if (dto.mode === ScreenGroupMode.Split) {
      if (!dto.gridColumns || !dto.gridRows) {
        throw new BadRequestException('gridColumns and gridRows are required when mode is split');
      }
    }

    const group = await this.create(organisationId, {
      name: dto.name,
      mode: dto.mode,
      gridColumns: dto.mode === ScreenGroupMode.Split ? dto.gridColumns : null,
      gridRows: dto.mode === ScreenGroupMode.Split ? dto.gridRows : null,
      ...(dto.color !== undefined ? { color: dto.color } : {}),
      ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
    });

    this.eventEmitter.emit(
      AUDIT_GROUP_CREATED,
      new AuditGroupEvent(group.id, organisationId, userId, {
        name: group.name,
        mode: group.mode,
        gridColumns: group.gridColumns,
        gridRows: group.gridRows,
      }),
    );

    return group;
  }

  async updateGroup(
    organisationId: string,
    id: string,
    dto: UpdateScreenGroupDto,
    userId: string | null = null,
  ): Promise<ScreenGroupWithScreens> {
    const group = await this.findOne(organisationId, id);
    const previousMode = group.mode;

    const effectiveMode = dto.mode ?? group.mode;

    if (effectiveMode === ScreenGroupMode.Split) {
      const effectiveColumns = dto.gridColumns ?? group.gridColumns;
      const effectiveRows = dto.gridRows ?? group.gridRows;
      if (!effectiveColumns || !effectiveRows) {
        throw new BadRequestException('gridColumns and gridRows are required when mode is split');
      }
    }

    const updates: Partial<ScreenGroup> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.mode !== undefined) updates.mode = dto.mode;
    if (dto.color !== undefined) updates.color = dto.color;
    if (dto.icon !== undefined) updates.icon = dto.icon;

    if (effectiveMode === ScreenGroupMode.Mirror) {
      updates.gridColumns = null;
      updates.gridRows = null;
    } else {
      if (dto.gridColumns !== undefined) updates.gridColumns = dto.gridColumns;
      if (dto.gridRows !== undefined) updates.gridRows = dto.gridRows;
    }

    const [saved] = await this.db
      .update(screenGroups)
      .set(updates)
      .where(and(eq(screenGroups.id, id), eq(screenGroups.organisationId, organisationId)))
      .returning();

    // Emit mode_changed event if mode actually changed
    if (dto.mode !== undefined && dto.mode !== previousMode) {
      this.eventEmitter.emit(
        AUDIT_GROUP_MODE_CHANGED,
        new AuditGroupEvent(saved.id, organisationId, userId, {
          previousMode,
          newMode: dto.mode,
        }),
      );
    }

    this.eventEmitter.emit(
      AUDIT_GROUP_UPDATED,
      new AuditGroupEvent(saved.id, organisationId, userId, {
        name: saved.name,
        mode: saved.mode,
        gridColumns: saved.gridColumns,
        gridRows: saved.gridRows,
      }),
    );

    return { ...saved, screens: group.screens };
  }

  async removeGroup(
    organisationId: string,
    id: string,
    userId: string | null = null,
  ): Promise<void> {
    const group = await this.findOne(organisationId, id);

    const memberCount = await this.db.$count(screens, eq(screens.groupId, group.id));

    if (memberCount > 0) {
      throw new ConflictException(
        `Cannot delete screen group "${group.name}" because it still has ${memberCount} assigned screen(s). Remove all screens from the group before deleting it.`,
      );
    }

    const groupId = group.id;
    const groupName = group.name;
    await this.db.delete(screenGroups).where(eq(screenGroups.id, groupId));

    this.eventEmitter.emit(
      AUDIT_GROUP_DELETED,
      new AuditGroupEvent(groupId, organisationId, userId, {
        name: groupName,
      }),
    );
  }

  async assignScreen(
    organisationId: string,
    groupId: string,
    screenId: string,
    dto: AssignScreenDto,
    userId: string | null = null,
  ): Promise<Screen> {
    const group = await this.findOne(organisationId, groupId);

    const [screen] = await this.db
      .select()
      .from(screens)
      .where(and(eq(screens.id, screenId), eq(screens.organisationId, organisationId)))
      .limit(1);
    if (!screen) {
      throw new NotFoundException(
        `Screen with id "${screenId}" not found in organisation "${organisationId}"`,
      );
    }

    // Check if screen already belongs to a different group
    if (screen.groupId && screen.groupId !== groupId) {
      throw new ConflictException(`Screen "${screen.name}" already belongs to another group`);
    }

    // For split-mode groups, grid position is required
    if (group.mode === ScreenGroupMode.Split) {
      if (dto.gridRow === undefined || dto.gridColumn === undefined) {
        throw new BadRequestException(
          'gridRow and gridColumn are required when assigning to a split-mode group',
        );
      }

      // Check for duplicate grid cell
      const [cellOccupied] = await this.db
        .select()
        .from(screens)
        .where(
          and(
            eq(screens.groupId, groupId),
            eq(screens.gridRow, dto.gridRow),
            eq(screens.gridColumn, dto.gridColumn),
          ),
        )
        .limit(1);
      if (cellOccupied && cellOccupied.id !== screenId) {
        throw new ConflictException(
          `Grid cell (${dto.gridRow}, ${dto.gridColumn}) is already occupied by screen "${cellOccupied.name}"`,
        );
      }
    }

    const [saved] = await this.db
      .update(screens)
      .set({
        groupId,
        gridRow: group.mode === ScreenGroupMode.Split ? (dto.gridRow ?? null) : null,
        gridColumn: group.mode === ScreenGroupMode.Split ? (dto.gridColumn ?? null) : null,
      })
      .where(eq(screens.id, screenId))
      .returning();

    this.eventEmitter.emit(
      AUDIT_GROUP_SCREEN_ADDED,
      new AuditGroupEvent(groupId, organisationId, userId, {
        screenId,
        screenName: saved.name,
        gridRow: saved.gridRow,
        gridColumn: saved.gridColumn,
      }),
    );

    return saved;
  }

  async removeScreen(
    organisationId: string,
    groupId: string,
    screenId: string,
    userId: string | null = null,
  ): Promise<Screen> {
    await this.findOne(organisationId, groupId);

    const [screen] = await this.db
      .select()
      .from(screens)
      .where(
        and(
          eq(screens.id, screenId),
          eq(screens.organisationId, organisationId),
          eq(screens.groupId, groupId),
        ),
      )
      .limit(1);
    if (!screen) {
      throw new NotFoundException(`Screen with id "${screenId}" not found in group "${groupId}"`);
    }

    const screenName = screen.name;
    const [saved] = await this.db
      .update(screens)
      .set({ groupId: null, gridRow: null, gridColumn: null })
      .where(eq(screens.id, screenId))
      .returning();

    this.eventEmitter.emit(
      AUDIT_GROUP_SCREEN_REMOVED,
      new AuditGroupEvent(groupId, organisationId, userId, {
        screenId,
        screenName,
      }),
    );

    return saved;
  }
}
