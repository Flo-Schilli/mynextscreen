import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SiteAgentScheduler } from './site-agent.scheduler';
import { SiteAgentService } from './site-agent.service';
import { SiteAgentEnrolmentService } from './site-agent-enrolment.service';
import { SiteAgentSessionService } from './site-agent-session.service';
import { SITE_AGENT_STATUS_CHANGED } from './site-agent-status.event';
import { AUDIT_SITE_AGENT_OFFLINE } from '../audit-log/audit.events';
import type { SiteAgent } from '../db/schema';

describe('SiteAgentScheduler', () => {
  let scheduler: SiteAgentScheduler;
  let siteAgentService: Record<string, jest.Mock>;
  let enrolments: Record<string, jest.Mock>;
  let sessions: Record<string, jest.Mock>;
  let emitter: { emit: jest.Mock };
  let configValues: Record<string, number>;

  const agent = {
    id: '660e8400-e29b-41d4-a716-446655440000',
    organisationId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Venue North',
  } as SiteAgent;

  async function build() {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteAgentScheduler,
        { provide: SiteAgentService, useValue: siteAgentService },
        { provide: SiteAgentEnrolmentService, useValue: enrolments },
        { provide: SiteAgentSessionService, useValue: sessions },
        { provide: EventEmitter2, useValue: emitter },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback: number) => configValues[key] ?? fallback),
          },
        },
      ],
    }).compile();
    return module.get(SiteAgentScheduler);
  }

  beforeEach(async () => {
    siteAgentService = { detectOfflineAgents: jest.fn().mockResolvedValue([]) };
    enrolments = { cleanupExpired: jest.fn().mockResolvedValue(0) };
    sessions = { cleanupExpired: jest.fn().mockResolvedValue(0) };
    emitter = { emit: jest.fn() };
    configValues = {};
    scheduler = await build();
  });

  describe('detectOfflineAgents', () => {
    it('uses a 180s default threshold', async () => {
      await scheduler.detectOfflineAgents();

      expect(siteAgentService.detectOfflineAgents).toHaveBeenCalledWith(180_000);
    });

    it('honours SITE_AGENT_OFFLINE_THRESHOLD_MS', async () => {
      configValues = { SITE_AGENT_OFFLINE_THRESHOLD_MS: 300_000 };
      scheduler = await build();

      await scheduler.detectOfflineAgents();

      expect(siteAgentService.detectOfflineAgents).toHaveBeenCalledWith(300_000);
    });

    it('emits a status change and an audit entry per newly offline agent', async () => {
      siteAgentService.detectOfflineAgents.mockResolvedValue([agent]);

      await scheduler.detectOfflineAgents();

      expect(emitter.emit).toHaveBeenCalledWith(
        SITE_AGENT_STATUS_CHANGED,
        expect.objectContaining({
          agentId: agent.id,
          isOnline: false,
          lastHeartbeat: agent.lastHeartbeat,
        }),
      );
      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_OFFLINE,
        expect.objectContaining({ agentId: agent.id }),
      );
    });

    it('stays silent when nothing changed', async () => {
      await scheduler.detectOfflineAgents();

      expect(emitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpired', () => {
    it('sweeps both enrolments and sessions', async () => {
      enrolments.cleanupExpired.mockResolvedValue(2);
      sessions.cleanupExpired.mockResolvedValue(3);

      await scheduler.cleanupExpired();

      expect(enrolments.cleanupExpired).toHaveBeenCalled();
      expect(sessions.cleanupExpired).toHaveBeenCalled();
    });

    it('runs both sweeps even when the first finds nothing', async () => {
      await scheduler.cleanupExpired();

      expect(sessions.cleanupExpired).toHaveBeenCalled();
    });
  });
});
