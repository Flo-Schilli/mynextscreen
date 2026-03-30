import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { ScreenGroup } from './screen-group.entity';
import { ScreenGroupMode } from './screen-group-mode.enum';
import { CreateScreenGroupDto } from './dto/create-screen-group.dto';
import { UpdateScreenGroupDto } from './dto/update-screen-group.dto';
import { AssignScreenDto } from './dto/assign-screen.dto';
import { Screen } from '../screen/screen.entity';

@Injectable()
export class ScreenGroupService extends OrganisationScopedService<ScreenGroup> {
  constructor(
    @InjectRepository(ScreenGroup)
    repository: Repository<ScreenGroup>,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
  ) {
    super(repository, 'ScreenGroup');
  }

  async createGroup(
    organisationId: string,
    dto: CreateScreenGroupDto,
  ): Promise<ScreenGroup> {
    if (dto.mode === ScreenGroupMode.Split) {
      if (!dto.gridColumns || !dto.gridRows) {
        throw new BadRequestException(
          'gridColumns and gridRows are required when mode is split',
        );
      }
    }

    return this.create(organisationId, {
      name: dto.name,
      mode: dto.mode,
      gridColumns: dto.mode === ScreenGroupMode.Split ? dto.gridColumns : null,
      gridRows: dto.mode === ScreenGroupMode.Split ? dto.gridRows : null,
    });
  }

  async updateGroup(
    organisationId: string,
    id: string,
    dto: UpdateScreenGroupDto,
  ): Promise<ScreenGroup> {
    const group = await this.findOne(organisationId, id);

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

    return this.repository.save(group);
  }

  async removeGroup(organisationId: string, id: string): Promise<void> {
    const group = await this.findOne(organisationId, id);

    const memberCount = await this.screenRepository.count({
      where: { groupId: group.id },
    });

    if (memberCount > 0) {
      throw new ConflictException(
        `Cannot delete screen group "${group.name}" because it still has ${memberCount} assigned screen(s). Remove all screens from the group before deleting it.`,
      );
    }

    await this.repository.remove(group);
  }

  async assignScreen(
    organisationId: string,
    groupId: string,
    screenId: string,
    dto: AssignScreenDto,
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

    return this.screenRepository.save(screen);
  }

  async removeScreen(
    organisationId: string,
    groupId: string,
    screenId: string,
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

    screen.groupId = null;
    screen.gridRow = null;
    screen.gridColumn = null;

    return this.screenRepository.save(screen);
  }
}
