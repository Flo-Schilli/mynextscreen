import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { OrganisationService } from './organisation.service';
import { CreateOrganisationDto, UpdateOrganisationDto } from './dto';
import { Organisation } from './organisation.entity';

@Controller('organisations')
@UseGuards(SuperAdminGuard)
export class OrganisationController {
  constructor(private readonly organisationService: OrganisationService) {}

  @Post()
  create(@Body() dto: CreateOrganisationDto): Promise<Organisation> {
    return this.organisationService.create(dto);
  }

  @Get()
  findAll(): Promise<Organisation[]> {
    return this.organisationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Organisation> {
    return this.organisationService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganisationDto,
  ): Promise<Organisation> {
    return this.organisationService.update(id, dto);
  }
}
