import { DashboardController } from './dashboard.controller';
import { DashboardSseService } from './dashboard-sse.service';
import { DashboardSummaryService } from './dashboard-summary.service';
import type { DashboardSummary } from './dto/dashboard-summary.dto';
import { of, firstValueFrom, take } from 'rxjs';
import type { UserService } from '../user/user.service';
import { OrganisationRole } from '../user/organisation-role.enum';

describe('DashboardController', () => {
  let controller: DashboardController;
  let sseService: jest.Mocked<Pick<DashboardSseService, 'subscribe'>>;
  let summaryService: jest.Mocked<Pick<DashboardSummaryService, 'getSummary'>>;
  let userService: { getMembership: jest.Mock };

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = 'user-123';

  beforeEach(() => {
    sseService = {
      subscribe: jest.fn(),
    };
    summaryService = {
      getSummary: jest.fn(),
    };
    userService = {
      getMembership: jest.fn().mockResolvedValue({ role: OrganisationRole.Viewer }),
    };

    controller = new DashboardController(
      sseService as unknown as DashboardSseService,
      summaryService as unknown as DashboardSummaryService,
      userService as unknown as UserService,
    );
  });

  describe('events', () => {
    it('subscribes a member who is not an admin without admin-only events', async () => {
      sseService.subscribe.mockReturnValue(of({ data: '', type: 'keepalive' }));
      const req = { user: { userId, email: 'test@example.com' } } as never;

      await firstValueFrom(controller.events(orgId, req));

      expect(userService.getMembership).toHaveBeenCalledWith(userId, orgId);
      expect(sseService.subscribe).toHaveBeenCalledWith(orgId, userId, false);
    });

    it('subscribes an org admin with admin-only events', async () => {
      userService.getMembership.mockResolvedValue({ role: OrganisationRole.OrgAdmin });
      sseService.subscribe.mockReturnValue(of({ data: '', type: 'keepalive' }));
      const req = { user: { userId, email: 'test@example.com' } } as never;

      await firstValueFrom(controller.events(orgId, req));

      expect(sseService.subscribe).toHaveBeenCalledWith(orgId, userId, true);
    });

    it('treats a super-admin as an admin without looking up a membership', async () => {
      sseService.subscribe.mockReturnValue(of({ data: '', type: 'keepalive' }));
      const req = { user: { userId, email: 'x', isSuperAdmin: true } } as never;

      await firstValueFrom(controller.events(orgId, req));

      expect(userService.getMembership).not.toHaveBeenCalled();
      expect(sseService.subscribe).toHaveBeenCalledWith(orgId, userId, true);
    });

    it('should return the Observable from DashboardSseService.subscribe', async () => {
      const mockEvent = {
        data: {
          type: 'screen.online',
          data: { screenId: 's-1' },
          timestamp: '2026-03-31T09:00:00.000Z',
        },
        type: 'state-change',
      };
      sseService.subscribe.mockReturnValue(of(mockEvent));

      const req = { user: { userId, email: 'test@example.com' } } as never;

      const result$ = controller.events(orgId, req);
      const result = await firstValueFrom(result$.pipe(take(1)));

      expect(result).toEqual(mockEvent);
    });
  });

  describe('getSummary', () => {
    it('delegates to DashboardSummaryService.getSummary with the scoped organisationId', async () => {
      const summary = {
        screens: { total: 3, online: 2, offline: 1, warning: 0 },
        content: { count: 8, libraryBytes: 4_800_000_000 },
        playlists: { count: 4 },
        schedules: { upcoming24h: 2 },
        storage: {
          originalUsedBytes: 1,
          originalLimitBytes: 2,
          transcodedUsedBytes: 3,
          transcodedLimitBytes: 4,
        },
        alerts: [],
      } satisfies DashboardSummary;
      summaryService.getSummary.mockResolvedValue(summary);

      const result = await controller.getSummary(orgId);

      expect(summaryService.getSummary).toHaveBeenCalledWith(orgId);
      expect(result).toBe(summary);
    });
  });
});
