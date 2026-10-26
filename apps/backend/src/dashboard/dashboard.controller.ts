import { Controller, Get, Req, Sse } from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { DashboardSseService } from './dashboard-sse.service';
import { DashboardSummaryService } from './dashboard-summary.service';
import type { DashboardSummary } from './dto/dashboard-summary.dto';
import { AuthenticatedRequest } from '../auth';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { Roles } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { UserService } from '../user/user.service';

interface MessageEvent {
  data: unknown;
  type?: string;
  id?: string;
  retry?: number;
}

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardSseService: DashboardSseService,
    private readonly dashboardSummaryService: DashboardSummaryService,
    private readonly userService: UserService,
  ) {}

  @Sse('events')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  events(
    @CurrentOrganisation() organisationId: string,
    @Req() req: AuthenticatedRequest,
  ): Observable<MessageEvent> {
    // Resolved once per connection: some events (agent backups) are for the
    // organisation's admins only. A role changed mid-session takes effect on
    // the next reconnect.
    return from(this.isOrgAdmin(organisationId, req)).pipe(
      switchMap((isOrgAdmin) =>
        this.dashboardSseService.subscribe(organisationId, req.user.userId, isOrgAdmin),
      ),
    );
  }

  @Get('summary')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  getSummary(@CurrentOrganisation() organisationId: string): Promise<DashboardSummary> {
    return this.dashboardSummaryService.getSummary(organisationId);
  }

  private async isOrgAdmin(organisationId: string, req: AuthenticatedRequest): Promise<boolean> {
    if (req.user.isSuperAdmin) {
      return true;
    }
    const membership = await this.userService.getMembership(req.user.userId, organisationId);
    return membership?.role === OrganisationRole.OrgAdmin;
  }
}
