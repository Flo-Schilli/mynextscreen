import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { SecretCipher } from '../common/secret-cipher.service';
import { organisations, screenRemoteControls, screens, siteAgents } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import { SCREEN_REMOTE_CONFIG_CHANGED } from './screen-onboarding.event';
import { OnboardingStep } from './site-agent-command.enum';
import {
  SiteAgentBackupRestoreService,
  onboardingStartStep,
  type BackupScreenEntry,
} from './site-agent-backup-restore.service';

describe('SiteAgentBackupRestoreService', () => {
  let db: DrizzleDB;
  let service: SiteAgentBackupRestoreService;
  let cipher: SecretCipher;
  let emitter: { emit: jest.Mock };
  let orgId: string;
  let otherOrgId: string;
  let agentId: string;
  let otherAgentId: string;

  // A real key, so stored passphrases are ciphertext — the thing worth asserting.
  const encryptionKey = Buffer.alloc(32, 7).toString('base64');
  const GONE = '00000000-0000-4000-8000-000000000001';
  const GONE_2 = '00000000-0000-4000-8000-000000000002';

  /** Everything a complete backup carries for one display. */
  const full = (screenId: string, name = 'Foyer'): BackupScreenEntry => ({
    screenId,
    name,
    localIp: '192.168.1.40',
    macAddress: 'AA:BB:CC:DD:EE:01',
    devmodePassphrase: 'F00BA2',
    ssapPort: 3000,
    hasSsapKey: true,
    hasDevmodeKey: true,
  });

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    emitter = { emit: jest.fn() };
    cipher = new SecretCipher({ get: jest.fn(() => encryptionKey) } as unknown as ConfigService);
    service = new SiteAgentBackupRestoreService(db, cipher, emitter as never);

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    const [other] = await db
      .insert(organisations)
      .values({ name: `Other ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    otherOrgId = other.id;
    const [agent] = await db
      .insert(siteAgents)
      .values({ organisationId: orgId, name: 'Venue North' })
      .returning();
    agentId = agent.id;
    const [otherAgent] = await db
      .insert(siteAgents)
      .values({ organisationId: orgId, name: 'Venue South' })
      .returning();
    otherAgentId = otherAgent.id;
  });

  async function screen(name: string, organisationId = orgId): Promise<string> {
    const [row] = await db
      .insert(screens)
      .values({
        organisationId,
        name,
        resolution: '1920x1080',
        location: 'x',
        apiKeyHash: `hash-${Math.random()}`,
      })
      .returning();
    return row.id;
  }

  async function control(screenId: string, values: Record<string, unknown>): Promise<void> {
    await db.insert(screenRemoteControls).values({ screenId, organisationId: orgId, ...values });
  }

  async function row(screenId: string) {
    const [found] = await db
      .select()
      .from(screenRemoteControls)
      .where(eq(screenRemoteControls.screenId, screenId));
    return found;
  }

  describe('plan', () => {
    it('says what each entry would do and which screens unknown ones may go to', async () => {
      const own = await screen('Bar');
      const bare = await screen('Stage');
      const foreign = await screen('Hall');
      const free = await screen('Annex');
      const taken = await screen('Balcony');
      await control(own, { agentId });
      await control(foreign, { agentId: otherAgentId });
      await control(taken, { agentId: otherAgentId });

      const plan = await service.plan(orgId, agentId, [
        { screenId: own, name: 'Bar (old)' },
        { screenId: bare },
        { screenId: foreign },
        { screenId: GONE, name: 'Foyer left' },
      ]);

      expect(plan.entries).toEqual([
        {
          screenId: own,
          backupName: 'Bar (old)',
          status: 'fill',
          screenName: 'Bar',
          ownerAgentName: null,
        },
        {
          screenId: bare,
          backupName: null,
          status: 'create',
          screenName: 'Stage',
          ownerAgentName: null,
        },
        {
          screenId: foreign,
          backupName: null,
          status: 'other_agent',
          screenName: 'Hall',
          ownerAgentName: 'Venue South',
        },
        {
          screenId: GONE,
          backupName: 'Foyer left',
          status: 'not_found',
          screenName: null,
          ownerAgentName: null,
        },
      ]);
      // Screens the backup already matches are not offered as targets.
      expect(plan.targets).toEqual([
        { screenId: free, name: 'Annex', selectable: true, ownerAgentName: null },
        { screenId: taken, name: 'Balcony', selectable: false, ownerAgentName: 'Venue South' },
      ]);
    });

    it('treats a screen of another organisation as unknown and never offers it', async () => {
      const elsewhere = await screen('Elsewhere', otherOrgId);

      const plan = await service.plan(orgId, agentId, [{ screenId: elsewhere }]);

      expect(plan.entries[0].status).toBe('not_found');
      expect(plan.targets.map((target) => target.screenId)).not.toContain(elsewhere);
    });

    it('counts a repeated entry once', async () => {
      const plan = await service.plan(orgId, agentId, [{ screenId: GONE }, { screenId: GONE }]);

      expect(plan.entries).toHaveLength(1);
    });
  });

  describe('validateMappings', () => {
    it('accepts unknown entries mapped once each onto selectable screens', async () => {
      const a = await screen('A');
      const b = await screen('B');
      const plan = await service.plan(orgId, agentId, [{ screenId: GONE }, { screenId: GONE_2 }]);

      expect(() =>
        service.validateMappings(plan, [
          { from: GONE, to: a },
          { from: GONE_2, to: b },
        ]),
      ).not.toThrow();
    });

    it.each([
      ['an entry that is not unknown', 'known'],
      ['a target of another agent', 'taken'],
      ['the same target twice', 'twice'],
      ['a target outside the organisation', 'foreign'],
    ])('refuses %s', async (_label, kind) => {
      const known = await screen('Known');
      const free = await screen('Free');
      const taken = await screen('Taken');
      const foreign = await screen('Foreign', otherOrgId);
      await control(taken, { agentId: otherAgentId });
      const plan = await service.plan(orgId, agentId, [
        { screenId: known },
        { screenId: GONE },
        { screenId: GONE_2 },
      ]);
      const mappings = {
        known: [{ from: known, to: free }],
        taken: [{ from: GONE, to: taken }],
        twice: [
          { from: GONE, to: free },
          { from: GONE_2, to: free },
        ],
        foreign: [{ from: GONE, to: foreign }],
      }[kind] as Array<{ from: string; to: string }>;

      expect(() => service.validateMappings(plan, mappings)).toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('recreates a screen without settings and starts it at the final check', async () => {
      const target = await screen('Foyer');

      const verdict = await service.restore(orgId, agentId, [full(target)], []);

      expect(verdict).toEqual({
        restored: [
          {
            screenId: target,
            sourceScreenId: target,
            created: true,
            mapped: false,
            fields: ['localIp', 'macAddress', 'devmodePassphrase'],
          },
        ],
        skipped: [],
      });
      const saved = await row(target);
      expect(saved).toMatchObject({
        agentId,
        localIp: '192.168.1.40',
        macAddress: 'AA:BB:CC:DD:EE:01',
        ssapPort: 3000,
        onboardingStep: OnboardingStep.Finish,
        onboardingCompletedAt: null,
      });
      expect(saved.devmodePassphrase).not.toBe('F00BA2');
      expect(cipher.decrypt(saved.devmodePassphrase)).toBe('F00BA2');
      expect(emitter.emit).toHaveBeenCalledWith(
        SCREEN_REMOTE_CONFIG_CHANGED,
        expect.objectContaining({ agentIds: [agentId] }),
      );
    });

    it('fills only the empty fields of its own screen and leaves its onboarding alone', async () => {
      const target = await screen('Bar');
      await control(target, { agentId, localIp: '10.0.0.9', onboardingStep: 3 });

      const verdict = await service.restore(orgId, agentId, [full(target)], []);

      expect(verdict.restored[0]).toMatchObject({
        mapped: false,
        fields: ['macAddress', 'devmodePassphrase'],
      });
      const saved = await row(target);
      expect(saved.localIp).toBe('10.0.0.9');
      expect(saved.ssapPort).toBe(3001);
      expect(saved.onboardingStep).toBe(3);
    });

    it('leaves a screen of another agent alone', async () => {
      const target = await screen('Hall');
      await control(target, { agentId: otherAgentId });

      const verdict = await service.restore(orgId, agentId, [full(target)], []);

      expect(verdict).toEqual({
        restored: [],
        skipped: [{ screenId: target, reason: 'assigned_to_other_agent' }],
      });
      expect((await row(target)).agentId).toBe(otherAgentId);
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it('skips an unknown entry the operator did not map', async () => {
      const verdict = await service.restore(orgId, agentId, [full(GONE)], []);

      expect(verdict.skipped).toEqual([{ screenId: GONE, reason: 'screen_not_found' }]);
    });

    it('overwrites the screen an unknown entry is mapped onto and restarts its onboarding', async () => {
      const target = await screen('Foyer (new)');
      await control(target, {
        agentId,
        localIp: '10.0.0.9',
        macAddress: '11:22:33:44:55:66',
        onboardingStep: 9,
        onboardingCompletedAt: new Date(),
      });

      const verdict = await service.restore(
        orgId,
        agentId,
        [full(GONE)],
        [{ from: GONE, to: target }],
      );

      expect(verdict.restored).toEqual([
        {
          screenId: target,
          sourceScreenId: GONE,
          created: false,
          mapped: true,
          fields: ['localIp', 'macAddress', 'devmodePassphrase'],
        },
      ]);
      expect(await row(target)).toMatchObject({
        localIp: '192.168.1.40',
        macAddress: 'AA:BB:CC:DD:EE:01',
        ssapPort: 3000,
        onboardingStep: OnboardingStep.Finish,
        onboardingCompletedAt: null,
      });
    });

    it('creates the settings of a mapped screen that had none', async () => {
      const target = await screen('Foyer (new)');

      const verdict = await service.restore(
        orgId,
        agentId,
        [full(GONE)],
        [{ from: GONE, to: target }],
      );

      expect(verdict.restored[0]).toMatchObject({ screenId: target, created: true, mapped: true });
      expect((await row(target)).agentId).toBe(agentId);
    });

    it('does not take a mapped target that went to another agent in the meantime', async () => {
      const target = await screen('Foyer (new)');
      await control(target, { agentId: otherAgentId });

      const verdict = await service.restore(
        orgId,
        agentId,
        [full(GONE)],
        [{ from: GONE, to: target }],
      );

      expect(verdict.skipped).toEqual([{ screenId: GONE, reason: 'target_unavailable' }]);
      expect((await row(target)).agentId).toBe(otherAgentId);
    });

    it('does not let a mapping claim a screen the backup restores directly', async () => {
      const target = await screen('Foyer');

      const verdict = await service.restore(
        orgId,
        agentId,
        [full(target), full(GONE)],
        [{ from: GONE, to: target }],
      );

      expect(verdict.restored.map((entry) => entry.sourceScreenId)).toEqual([target]);
      expect(verdict.skipped).toEqual([{ screenId: GONE, reason: 'target_unavailable' }]);
    });

    it('takes the first entry when an id repeats, instead of failing the import', async () => {
      const target = await screen('Foyer');

      const verdict = await service.restore(
        orgId,
        agentId,
        [
          { screenId: target, localIp: '192.168.1.40' },
          { screenId: target, localIp: '192.168.1.99' },
        ],
        [],
      );

      expect(verdict.restored).toHaveLength(1);
      expect((await row(target)).localIp).toBe('192.168.1.40');
    });

    it('does nothing for an empty backup', async () => {
      await expect(service.restore(orgId, agentId, [], [])).resolves.toEqual({
        restored: [],
        skipped: [],
      });
      expect(emitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('onboardingStartStep', () => {
    const complete = full(GONE);

    it.each([
      ['everything', complete, OnboardingStep.Finish],
      ['no pairing key', { ...complete, hasSsapKey: false }, OnboardingStep.Ssh],
      ['no passphrase', { ...complete, devmodePassphrase: undefined }, OnboardingStep.Passphrase],
      ['no SSH key', { ...complete, hasDevmodeKey: false }, OnboardingStep.KeyServer],
      ['no address', { ...complete, localIp: undefined }, OnboardingStep.Network],
    ])('starts with %s at the first step it does not cover', (_label, entry, step) => {
      expect(onboardingStartStep(entry)).toBe(step);
    });
  });
});
