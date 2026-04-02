import { Controller, Req, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DashboardSseService } from './dashboard-sse.service';
import { AuthenticatedRequest } from '../auth';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { Roles } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';

interface MessageEvent {
  data: unknown;
  type?: string;
  id?: string;
  retry?: number;
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardSseService: DashboardSseService) {}

  @Sse('events')
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  events(
    @CurrentOrganisation() organisationId: string,
    @Req() req: AuthenticatedRequest,
  ): Observable<MessageEvent> {
    return this.dashboardSseService.subscribe(organisationId, req.user.userId);
  }
}
