import { Controller, Get } from '@nestjs/common';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { Roles } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { MetricsQueryService } from './metrics-query.service';
import type { DashboardHistory } from './dto/metrics.dto';

/**
 * Org-scoped KPI history powering the dashboard sparklines. Same role gate as
 * the dashboard summary (`GET /api/dashboard/summary`).
 */
@Controller('dashboard')
export class DashboardMetricsController {
  constructor(private readonly metrics: MetricsQueryService) {}

  @Get('history')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  getHistory(@CurrentOrganisation() organisationId: string): Promise<DashboardHistory> {
    return this.metrics.getOrgHistory(organisationId);
  }
}
