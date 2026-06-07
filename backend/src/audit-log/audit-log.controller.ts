import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService, AuditLogFilters } from './audit-log.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { OrganisationRole } from '../user/organisation-role.enum';
import { AuditEntry } from './audit-entry.entity';
import { AuditLogQueryDto, AdminAuditLogQueryDto } from './audit-log-query.dto';

function buildFilters(query: AuditLogQueryDto): AuditLogFilters {
  const filters: AuditLogFilters = {};

  if (query.action) {
    filters.action = query.action;
  }
  if (query.userId) {
    filters.userId = query.userId;
  }
  if (query.resourceType) {
    filters.resourceType = query.resourceType;
  }
  if (query.resourceId) {
    filters.resourceId = query.resourceId;
  }
  if (query.from) {
    filters.from = new Date(query.from);
  }
  if (query.to) {
    filters.to = new Date(query.to);
  }

  const limit = query.limit ? Math.min(Number(query.limit), 200) : 50;
  filters.limit = limit;
  filters.offset = query.offset ? Number(query.offset) : 0;

  return filters;
}

@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(OrganisationRole.OrgAdmin)
  findByOrganisation(
    @CurrentOrganisation() organisationId: string,
    @Query() query: AuditLogQueryDto,
  ): Promise<{ data: AuditEntry[]; total: number }> {
    return this.auditLogService.findByOrganisation(organisationId, buildFilters(query));
  }
}

@Controller('admin/audit-log')
@UseGuards(SuperAdminGuard)
export class AdminAuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  findAll(@Query() query: AdminAuditLogQueryDto): Promise<{ data: AuditEntry[]; total: number }> {
    const filters = buildFilters(query);

    if (query.organisationId) {
      return this.auditLogService.findByOrganisation(query.organisationId, filters);
    }

    return this.auditLogService.findAll(filters);
  }
}
