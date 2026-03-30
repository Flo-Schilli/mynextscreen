import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { ScreenGroup } from './screen-group.entity';
import { ScreenGroupMode } from './screen-group-mode.enum';
import { CreateScreenGroupDto } from './dto/create-screen-group.dto';
import { UpdateScreenGroupDto } from './dto/update-screen-group.dto';
import { AssignScreenDto } from './dto/assign-screen.dto';
import { Screen } from '../screen/screen.entity';
import {
  AUDIT_GROUP_CREATED,
  AUDIT_GROUP_UPDATED,
  AUDIT_GROUP_DELETED,
  AUDIT_GROUP_SCREEN_ADDED,
  AUDIT_GROUP_SCREEN_REMOVED,
  AUDIT_GROUP_MODE_CHANGED,
  AuditGroupEvent,
} from '../audit-log/audit.events';

@Injectable()
export class ScreenGroupService extends OrganisationScopedService<ScreenGroup> {
  constructor(
    @InjectRepository(ScreenGroup)
    repository: Repository<ScreenGroup>,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(repository, 'ScreenGroup');
  }

  override async findAll(organisationId: string): Promise<ScreenGroup[]> {
    return this.repository.find({
      where: { organisationId } as any,
      relations: ['screens'],
    });
  }

  override async findOne(organisationId: string, id: string): Promise<ScreenGroup> {
    const entity = await this.repository.findOne({
      where: { organisationId, id } as any,
      relations: ['screens'],
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
        throw new BadRequestException(
          'gridColumns and gridRows are required when mode is split',
        );
      }
    }

    const group = await this.create(organisationId, {
      name: dto.name,
      mode: dto.mode,
      gridColumns: dto.mode === ScreenGroupMode.Split ? dto.gridColumns : null,
      gridRows: dto.mode === ScreenGroupMode.Split ? dto.gridRows : null,
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
  ): Promise<ScreenGroup> {
    const group = await this.findOne(organisationId, id);
    const previousMode = group.mode;

    const effectiveMode = dto.mode ?? group.mode;

    if (effectiveMode === ScreenGroupMode.Split) {
      const effectiveColumns = dto.gridColumns ?? group.gridColumns;
      const effectiveRows = dto.gridRows ?? group.gridRows;
      if (!effectiveColumns || !effectiveRows) {
        throw new BadRequestException(
          'gridColumns and gridRows are required when mode is split',
        );
      }
    }

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.mode !== undefined) group.mode = dto.mode;

    if (effectiveMode === ScreenGroupMode.Mirror) {
      group.gridColumns = null;
      group.gridRows = null;
    } else {
      if (dto.gridColumns !== undefined) group.gridColumns = dto.gridColumns;
      if (dto.gridRows !== undefined) group.gridRows = dto.gridRows;
    }

    const saved = await this.repository.save(group);

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

    return saved;
  }

  async removeGroup(
    organisationId: string,
    id: string,
    userId: string | null = null,
  ): Promise<void> {
    const group = await this.findOne(organisationId, id);

    const memberCount = await this.screenRepository.count({
      where: { groupId: group.id },
    });

    if (memberCount > 0) {
      throw new ConflictException(
        `Cannot delete screen group "${group.name}" because it still has ${memberCount} assigned screen(s). Remove all screens from the group before deleting it.`,
      );
    }

    const groupId = group.id;
    const groupName = group.name;
    await this.repository.remove(group);

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

    const screen = await this.screenRepository.findOne({
      where: { id: screenId, organisationId },
    });
    if (!screen) {
      throw new NotFoundException(
        `Screen with id "${screenId}" not found in organisation "${organisationId}"`,
      );
    }

    // Check if screen already belongs to a different group
    if (screen.groupId && screen.groupId !== groupId) {
      throw new ConflictException(
        `Screen "${screen.name}" already belongs to another group`,
      );
    }

    // For split-mode groups, grid position is required
    if (group.mode === ScreenGroupMode.Split) {
      if (dto.gridRow === undefined || dto.gridColumn === undefined) {
        throw new BadRequestException(
          'gridRow and gridColumn are required when assigning to a split-mode group',
        );
      }

      // Check for duplicate grid cell
      const cellOccupied = await this.screenRepository.findOne({
        where: {
          groupId,
          gridRow: dto.gridRow,
          gridColumn: dto.gridColumn,
        },
      });
      if (cellOccupied && cellOccupied.id !== screenId) {
        throw new ConflictException(
          `Grid cell (${dto.gridRow}, ${dto.gridColumn}) is already occupied by screen "${cellOccupied.name}"`,
        );
      }
    }

    screen.groupId = groupId;
    screen.gridRow = group.mode === ScreenGroupMode.Split ? (dto.gridRow ?? null) : null;
    screen.gridColumn = group.mode === ScreenGroupMode.Split ? (dto.gridColumn ?? null) : null;

    const saved = await this.screenRepository.save(screen);

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

    const screen = await this.screenRepository.findOne({
      where: { id: screenId, organisationId, groupId },
    });
    if (!screen) {
      throw new NotFoundException(
        `Screen with id "${screenId}" not found in group "${groupId}"`,
      );
    }

    const screenName = screen.name;
    screen.groupId = null;
    screen.gridRow = null;
    screen.gridColumn = null;

    const saved = await this.screenRepository.save(screen);

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
