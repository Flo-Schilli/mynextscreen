import { ConflictException, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  AUDIT_SITE_AGENT_CAPTURE_LICENSE_ACCEPTED,
  AUDIT_SITE_AGENT_CAPTURE_LICENSE_REVOKED,
} from '../audit-log/audit.events';
import {
  capturePluginAcceptances,
  capturePluginLicenseTexts,
  organisations,
  siteAgents,
  users,
} from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';
import { closeTestDb, initTestDb, truncateAll } from '../test/db-harness';
import { CapturePluginAcceptanceService } from './capture-plugin-acceptance.service';
import { CapturePluginLicenseTextService } from './capture-plugin-license-text.service';
import { CapturePluginStatusService } from './capture-plugin-status.service';
import { CAPTURE_LICENSE_REVOKED } from './capture-license-revoked.event';
import { SiteAgentCommandType } from './site-agent-command.enum';
import type { AgentCapturePluginReportDto } from './dto/agent-report.dto';

const HASH = 'a'.repeat(64);
const OTHER_HASH = 'b'.repeat(64);

describe('CapturePluginAcceptanceService', () => {
  let db: DrizzleDB;
  let service: CapturePluginAcceptanceService;
  let status: CapturePluginStatusService;
  let sse: { push: jest.Mock; isConnected: jest.Mock };
  let emitter: { emit: jest.Mock; emitAsync: jest.Mock };
  let orgId: string;
  let otherOrgId: string;
  let agentId: string;
  let userId: string;

  const report = (
    overrides: Partial<AgentCapturePluginReportDto> = {},
    hash = HASH,
  ): AgentCapturePluginReportDto => ({
    state: 'license_required',
    pluginVersion: '0.1.0',
    sdkVersion: '6.3.2.0',
    license: { licenseSha256: hash, ndiLicenseSha256: 'c'.repeat(64), termsSha256: 'd'.repeat(64) },
    ...overrides,
  });

  const storeText = (hash = HASH): Promise<unknown> =>
    db.insert(capturePluginLicenseTexts).values({
      licenseSha256: hash,
      ndiLicenseSha256: 'c'.repeat(64),
      termsSha256: 'd'.repeat(64),
      ndiLicenseText: 'ndi text',
      termsText: 'terms text',
    });

  const activeRows = () =>
    db
      .select()
      .from(capturePluginAcceptances)
      .where(
        and(
          eq(capturePluginAcceptances.agentId, agentId),
          isNull(capturePluginAcceptances.revokedAt),
        ),
      );

  beforeAll(async () => {
    db = await initTestDb();
  });
  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const [org] = await db
      .insert(organisations)
      .values({ name: 'Org A', timeZone: 'UTC' })
      .returning();
    const [other] = await db
      .insert(organisations)
      .values({ name: 'Org B', timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    otherOrgId = other.id;
    const [agent] = await db
      .insert(siteAgents)
      .values({ organisationId: orgId, name: 'Venue' })
      .returning();
    agentId = agent.id;
    const [user] = await db
      .insert(users)
      .values({ email: 'admin@example.com', name: 'Ada Admin' })
      .returning();
    userId = user.id;

    status = new CapturePluginStatusService();
    sse = { push: jest.fn().mockReturnValue(true), isConnected: jest.fn().mockReturnValue(true) };
    emitter = { emit: jest.fn(), emitAsync: jest.fn().mockResolvedValue([]) };
    const agents = {
      findOne: jest.fn(async (org_: string, id: string) => {
        const [row] = await db.select().from(siteAgents).where(eq(siteAgents.id, id));
        if (!row || row.organisationId !== org_) {
          throw new NotFoundException('Site agent not found');
        }
        return row;
      }),
    };
    service = new CapturePluginAcceptanceService(
      db,
      agents as never,
      status,
      new CapturePluginLicenseTextService(db),
      sse as never,
      emitter as never,
    );
  });

  describe('getView', () => {
    it('is absent without a fresh report', async () => {
      expect(await service.getView(orgId, agentId)).toEqual({
        state: 'absent',
        pluginVersion: null,
        sdkVersion: null,
        errorCode: null,
        license: null,
        licenseTextAvailable: false,
        acceptance: null,
        reportedAt: null,
      });
    });

    it('shows the reported license and whether its text is stored', async () => {
      status.record(agentId, report());

      expect((await service.getView(orgId, agentId)).licenseTextAvailable).toBe(false);
      await storeText();
      const view = await service.getView(orgId, agentId);

      expect(view).toEqual(
        expect.objectContaining({
          state: 'license_required',
          pluginVersion: '0.1.0',
          sdkVersion: '6.3.2.0',
          licenseTextAvailable: true,
          license: expect.objectContaining({ licenseSha256: HASH }),
        }),
      );
    });

    it('names the accepting user, without an email', async () => {
      status.record(agentId, report());
      await storeText();
      await service.accept(orgId, agentId, userId, HASH);

      const view = await service.getView(orgId, agentId);

      expect(view.acceptance).toEqual({
        licenseSha256: HASH,
        source: 'dashboard',
        acceptedAt: expect.any(String),
        acceptedBy: { id: userId, name: 'Ada Admin' },
      });
    });

    it('is not found for an agent of another organisation', async () => {
      await expect(service.getView(otherOrgId, agentId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLicenseText', () => {
    it('returns the stored text of the reported hash', async () => {
      status.record(agentId, report());
      await storeText();

      expect(await service.getLicenseText(orgId, agentId)).toEqual({
        licenseSha256: HASH,
        ndiLicenseText: 'ndi text',
        termsText: 'terms text',
      });
    });

    it('is 404 when no text is stored for the current hash, or nothing is reported', async () => {
      await expect(service.getLicenseText(orgId, agentId)).rejects.toThrow(NotFoundException);
      status.record(agentId, report({}, OTHER_HASH));
      await storeText(HASH);

      await expect(service.getLicenseText(orgId, agentId)).rejects.toThrow(NotFoundException);
    });

    it('is not found for another organisation', async () => {
      status.record(agentId, report());
      await storeText();

      await expect(service.getLicenseText(otherOrgId, agentId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('accept', () => {
    it('answers 409 license_mismatch when nothing is reported or the hash differs', async () => {
      await expect(service.accept(orgId, agentId, userId, HASH)).rejects.toThrow(
        new ConflictException('license_mismatch'),
      );
      status.record(agentId, report({}, OTHER_HASH));

      await expect(service.accept(orgId, agentId, userId, HASH)).rejects.toThrow(
        new ConflictException('license_mismatch'),
      );
      expect(await db.$count(capturePluginAcceptances)).toBe(0);
    });

    it('answers 409 license_text_missing when the text is not stored', async () => {
      status.record(agentId, report());

      await expect(service.accept(orgId, agentId, userId, HASH)).rejects.toThrow(
        new ConflictException('license_text_missing'),
      );
      expect(await db.$count(capturePluginAcceptances)).toBe(0);
    });

    it('stores the acceptance, audits it and pushes reload_config', async () => {
      status.record(agentId, report());
      await storeText();

      await service.accept(orgId, agentId, userId, HASH);

      const [row] = await activeRows();
      expect(row).toEqual(
        expect.objectContaining({
          organisationId: orgId,
          licenseSha256: HASH,
          source: 'dashboard',
          acceptedByUserId: userId,
        }),
      );
      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_CAPTURE_LICENSE_ACCEPTED,
        expect.objectContaining({
          agentId,
          organisationId: orgId,
          userId,
          details: { licenseSha256: HASH, source: 'dashboard' },
        }),
      );
      expect(sse.push).toHaveBeenCalledWith(
        agentId,
        expect.objectContaining({ type: SiteAgentCommandType.ReloadConfig }),
      );
    });

    it('supersedes an earlier active acceptance, leaving one active row', async () => {
      status.record(agentId, report({}, OTHER_HASH));
      await storeText(OTHER_HASH);
      await service.accept(orgId, agentId, userId, OTHER_HASH);
      status.record(agentId, report());
      await storeText();

      await service.accept(orgId, agentId, userId, HASH);

      const active = await activeRows();
      expect(active.map((row) => row.licenseSha256)).toEqual([HASH]);
      expect(await db.$count(capturePluginAcceptances)).toBe(2);
    });

    it('survives concurrent accepts: one active row, no unique violation escapes', async () => {
      status.record(agentId, report());
      await storeText();

      const results = await Promise.allSettled(
        Array.from({ length: 4 }, () => service.accept(orgId, agentId, userId, HASH)),
      );

      expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
      expect(await activeRows()).toHaveLength(1);
    });

    it('rejects a second active row at the database level', async () => {
      const row = {
        organisationId: orgId,
        agentId,
        licenseSha256: HASH,
        source: 'dashboard',
      } as const;
      await db.insert(capturePluginAcceptances).values(row);

      await expect(db.insert(capturePluginAcceptances).values(row)).rejects.toThrow();
    });

    it('is not found for an agent of another organisation', async () => {
      status.record(agentId, report());
      await storeText();

      await expect(service.accept(otherOrgId, agentId, userId, HASH)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('revoke', () => {
    it('marks the row revoked, audits it and pushes reload_config', async () => {
      status.record(agentId, report());
      await storeText();
      await service.accept(orgId, agentId, userId, HASH);
      sse.push.mockClear();

      await service.revoke(orgId, agentId, userId);

      expect(await activeRows()).toHaveLength(0);
      const [row] = await db.select().from(capturePluginAcceptances);
      expect(row.revokedAt).toBeInstanceOf(Date);
      expect(row.revokedByUserId).toBe(userId);
      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_CAPTURE_LICENSE_REVOKED,
        expect.objectContaining({
          agentId,
          organisationId: orgId,
          userId,
          details: { licenseSha256: HASH },
        }),
      );
      expect(sse.push).toHaveBeenCalledTimes(1);
      expect(emitter.emitAsync).toHaveBeenCalledWith(
        CAPTURE_LICENSE_REVOKED,
        expect.objectContaining({ agentId, organisationId: orgId, userId }),
      );
    });

    it('answers 409 device_acceptance when only a device acceptance is active', async () => {
      status.record(agentId, report({ state: 'ready', acceptedVia: 'environment' }));
      await service.recordDeviceAcceptance(orgId, agentId, status.get(agentId)!);

      await expect(service.revoke(orgId, agentId, userId)).rejects.toThrow(
        new ConflictException('device_acceptance'),
      );

      expect(await activeRows()).toHaveLength(1);
      expect(emitter.emitAsync).not.toHaveBeenCalled();
    });

    it('records the environment acceptance again after a dashboard acceptance over it is revoked', async () => {
      status.record(agentId, report({ state: 'ready', acceptedVia: 'environment' }));
      await service.recordDeviceAcceptance(orgId, agentId, status.get(agentId)!);
      await storeText();
      await service.accept(orgId, agentId, userId, HASH);
      await service.revoke(orgId, agentId, userId);
      expect(await activeRows()).toHaveLength(0);

      await service.recordDeviceAcceptance(orgId, agentId, status.get(agentId)!);

      const [row] = await activeRows();
      expect(row).toEqual(expect.objectContaining({ source: 'device', licenseSha256: HASH }));
      await expect(service.revoke(orgId, agentId, userId)).rejects.toThrow('device_acceptance');
    });

    it('is 404 without an active acceptance', async () => {
      await expect(service.revoke(orgId, agentId, userId)).rejects.toThrow(NotFoundException);
    });

    it('is not found for another organisation and leaves the acceptance alone', async () => {
      status.record(agentId, report());
      await storeText();
      await service.accept(orgId, agentId, userId, HASH);

      await expect(service.revoke(otherOrgId, agentId, userId)).rejects.toThrow(NotFoundException);

      expect(await activeRows()).toHaveLength(1);
    });
  });

  describe('recordDeviceAcceptance', () => {
    const record = (overrides: Partial<AgentCapturePluginReportDto> = {}) => {
      status.record(agentId, report({ state: 'ready', acceptedVia: 'environment', ...overrides }));
      return service.recordDeviceAcceptance(orgId, agentId, status.get(agentId)!);
    };

    it('creates a device row without a user and audits it', async () => {
      await record();

      const [row] = await activeRows();
      expect(row).toEqual(
        expect.objectContaining({ source: 'device', acceptedByUserId: null, licenseSha256: HASH }),
      );
      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_CAPTURE_LICENSE_ACCEPTED,
        expect.objectContaining({
          userId: null,
          details: { licenseSha256: HASH, source: 'device' },
        }),
      );
    });

    it('does nothing for api acceptances, missing hashes or no acceptance', async () => {
      await record({ acceptedVia: 'api' });
      await record({ acceptedVia: null });
      status.record(agentId, { state: 'ready', acceptedVia: 'environment' });
      await service.recordDeviceAcceptance(orgId, agentId, status.get(agentId)!);

      expect(await db.$count(capturePluginAcceptances)).toBe(0);
    });

    it('records once per hash, even across repeated reports and a fresh service', async () => {
      await record();
      await record();
      const second = new CapturePluginAcceptanceService(
        db,
        {} as never,
        status,
        {} as never,
        sse as never,
        emitter as never,
      );
      await second.recordDeviceAcceptance(orgId, agentId, status.get(agentId)!);

      expect(await db.$count(capturePluginAcceptances)).toBe(1);
      expect(emitter.emit).toHaveBeenCalledTimes(1);
    });

    it('does not duplicate an existing active acceptance of the same hash', async () => {
      status.record(agentId, report());
      await storeText();
      await service.accept(orgId, agentId, userId, HASH);
      emitter.emit.mockClear();

      await record();

      expect(await db.$count(capturePluginAcceptances)).toBe(1);
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it('lets an environment acceptance for a new hash supersede a dashboard row', async () => {
      status.record(agentId, report({}, OTHER_HASH));
      await storeText(OTHER_HASH);
      await service.accept(orgId, agentId, userId, OTHER_HASH);

      await record();

      const active = await activeRows();
      expect(active.map((row) => [row.source, row.licenseSha256])).toEqual([['device', HASH]]);
    });

    it('records a new device row for a new license hash', async () => {
      await record();
      await record({ license: report({}, OTHER_HASH).license });

      expect(await db.$count(capturePluginAcceptances)).toBe(2);
    });
  });

  describe('stateOf and assertNdiReady', () => {
    it('reports absent, then the reported state', () => {
      expect(service.stateOf(agentId)).toBe('absent');
      status.record(agentId, report({ state: 'ready' }));

      expect(service.stateOf(agentId)).toBe('ready');
    });

    const notReady = new ConflictException('capture_plugin_not_ready');

    it('refuses without a fresh report once the startup window has passed', async () => {
      const late = new CapturePluginStatusService(Date.now() - 10 * 60_000);
      const lateService = new CapturePluginAcceptanceService(
        db,
        {} as never,
        late,
        {} as never,
        sse as never,
        emitter as never,
      );

      await expect(lateService.assertNdiReady(agentId)).rejects.toThrow(notReady);
    });

    it('answers a retryable capture_plugin_status_pending while no report has arrived since start', async () => {
      await expect(service.assertNdiReady(agentId)).rejects.toThrow(
        new ConflictException('capture_plugin_status_pending'),
      );
    });

    it('is not pending for a disconnected agent', async () => {
      sse.isConnected.mockReturnValue(false);

      await expect(service.assertNdiReady(agentId)).rejects.toThrow(notReady);
    });

    it('is not pending once the agent has reported, even if it then goes stale', async () => {
      status.record(agentId, report(), 1_000);

      expect(status.isStatusPending(agentId)).toBe(false);
      await expect(service.assertNdiReady(agentId)).rejects.toThrow(notReady);
    });

    it('refuses a plugin that is not ready, even with an acceptance', async () => {
      status.record(agentId, report({ state: 'license_required' }));
      await storeText();
      await service.accept(orgId, agentId, userId, HASH);

      await expect(service.assertNdiReady(agentId)).rejects.toThrow(notReady);
    });

    it('refuses a ready plugin without a matching active acceptance', async () => {
      status.record(agentId, report({ state: 'ready' }));
      await expect(service.assertNdiReady(agentId)).rejects.toThrow(notReady);

      await db.insert(capturePluginAcceptances).values({
        organisationId: orgId,
        agentId,
        licenseSha256: OTHER_HASH,
        source: 'dashboard',
      });
      await expect(service.assertNdiReady(agentId)).rejects.toThrow(notReady);
    });

    it('refuses once the acceptance is revoked', async () => {
      status.record(agentId, report());
      await storeText();
      await service.accept(orgId, agentId, userId, HASH);
      status.record(agentId, report({ state: 'ready' }));
      await expect(service.assertNdiReady(agentId)).resolves.toBeUndefined();

      await service.revoke(orgId, agentId, userId);

      await expect(service.assertNdiReady(agentId)).rejects.toThrow(notReady);
    });

    it('accepts a ready plugin with a device acceptance', async () => {
      status.record(agentId, report({ state: 'ready', acceptedVia: 'environment' }));
      await service.recordDeviceAcceptance(orgId, agentId, status.get(agentId)!);

      await expect(service.assertNdiReady(agentId)).resolves.toBeUndefined();
    });
  });
});
