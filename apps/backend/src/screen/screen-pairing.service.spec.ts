import { Test, TestingModule } from '@nestjs/testing';
import { GoneException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { ScreenPairingService } from './screen-pairing.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screenPairings, screens, type Organisation } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import { sha256hex } from './api-key.util';

describe('ScreenPairingService', () => {
  let service: ScreenPairingService;
  let db: DrizzleDB;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScreenPairingService, { provide: DRIZZLE, useValue: db }],
    }).compile();
    service = module.get<ScreenPairingService>(ScreenPairingService);
  });

  async function seedOrg(): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    return org;
  }

  describe('startPairing', () => {
    it('creates a pending row with a 6-digit code and returns the raw secret', async () => {
      const result = await service.startPairing();

      expect(result.code).toMatch(/^\d{6}$/);
      expect(result.pairingSecret.length).toBeGreaterThan(20);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

      const [row] = await db
        .select()
        .from(screenPairings)
        .where(eq(screenPairings.id, result.pairingId));
      expect(row.status).toBe('pending');
      // Only the hash is persisted, never the raw secret.
      expect(row.pairingSecretHash).toBe(sha256hex(result.pairingSecret));
      expect(row.apiKey).toBeNull();
    });

    it('derives the 6-digit code from the CSPRNG (crypto.randomInt)', async () => {
      const spy = jest.spyOn(crypto, 'randomInt') as unknown as jest.SpyInstance;
      // randomInt(100000, 1000000) → return a fixed value to assert wiring.
      spy.mockImplementation(() => 100042);

      const started = await service.startPairing();

      expect(spy).toHaveBeenCalledWith(100000, 1000000);
      expect(started.code).toBe('100042');
      expect(started.code).toMatch(/^\d{6}$/);

      spy.mockRestore();
    });

    it('retries when a generated code collides with an active row', async () => {
      const spy = jest
        .spyOn(
          ScreenPairingService.prototype as unknown as { randomSixDigitCode: () => string },
          'randomSixDigitCode',
        )
        .mockReturnValueOnce('424242')
        .mockReturnValueOnce('424242')
        .mockReturnValueOnce('515151');

      const first = await service.startPairing();
      expect(first.code).toBe('424242');

      const second = await service.startPairing();
      expect(second.code).toBe('515151');

      spy.mockRestore();
    });
  });

  describe('getStatus', () => {
    it('returns pending for a fresh pairing with the correct secret', async () => {
      const started = await service.startPairing();

      const result = await service.getStatus(started.pairingId, started.pairingSecret);

      expect(result).toEqual({ status: 'pending' });
    });

    it('throws NotFoundException when the secret is wrong', async () => {
      const started = await service.startPairing();

      await expect(service.getStatus(started.pairingId, 'wrong-secret')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the secret is missing', async () => {
      const started = await service.startPairing();

      await expect(service.getStatus(started.pairingId, undefined)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the pairing id does not exist', async () => {
      await expect(service.getStatus('00000000-0000-0000-0000-000000000000', 'x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns claimed once, then transitions to consumed and nulls the apiKey', async () => {
      const org = await seedOrg();
      const [screen] = await db
        .insert(screens)
        .values({
          organisationId: org.id,
          name: 'S',
          resolution: '1920x1080',
          location: 'L',
          apiKeyHash: '$2b$10$h',
        })
        .returning();
      const started = await service.startPairing();
      await service.markClaimed(started.pairingId, screen.id, org.id, 'plaintext-key');

      const claimed = await service.getStatus(started.pairingId, started.pairingSecret);

      expect(claimed).toEqual({
        status: 'claimed',
        apiKey: 'plaintext-key',
        screenId: screen.id,
        organisationId: org.id,
      });

      const [row] = await db
        .select()
        .from(screenPairings)
        .where(eq(screenPairings.id, started.pairingId));
      expect(row.status).toBe('consumed');
      expect(row.apiKey).toBeNull();

      // Second poll → 410 Gone.
      await expect(service.getStatus(started.pairingId, started.pairingSecret)).rejects.toThrow(
        GoneException,
      );
    });

    it('delivers the apiKey to exactly one of two concurrent polls (H-1 atomic guard)', async () => {
      const org = await seedOrg();
      const [screen] = await db
        .insert(screens)
        .values({
          organisationId: org.id,
          name: 'S',
          resolution: '1920x1080',
          location: 'L',
          apiKeyHash: '$2b$10$h',
        })
        .returning();
      const started = await service.startPairing();
      await service.markClaimed(started.pairingId, screen.id, org.id, 'plaintext-key');

      // Fire two polls concurrently; the atomic UPDATE ... WHERE status='claimed'
      // guarantees only one returns the key, the other gets 410 Gone.
      const results = await Promise.allSettled([
        service.getStatus(started.pairingId, started.pairingSecret),
        service.getStatus(started.pairingId, started.pairingSecret),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((fulfilled[0] as PromiseFulfilledResult<unknown>).value).toEqual({
        status: 'claimed',
        apiKey: 'plaintext-key',
        screenId: screen.id,
        organisationId: org.id,
      });
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(GoneException);

      // Row is consumed and the key is nulled afterwards.
      const [row] = await db
        .select()
        .from(screenPairings)
        .where(eq(screenPairings.id, started.pairingId));
      expect(row.status).toBe('consumed');
      expect(row.apiKey).toBeNull();
    });

    it('throws GoneException for an expired pending pairing', async () => {
      const started = await service.startPairing();
      await db
        .update(screenPairings)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(screenPairings.id, started.pairingId));

      await expect(service.getStatus(started.pairingId, started.pairingSecret)).rejects.toThrow(
        GoneException,
      );
    });
  });

  describe('findClaimableByCode', () => {
    it('returns a pending non-expired pairing', async () => {
      const started = await service.startPairing();

      const found = await service.findClaimableByCode(started.code);

      expect(found?.id).toBe(started.pairingId);
    });

    it('returns null for an expired pairing', async () => {
      const started = await service.startPairing();
      await db
        .update(screenPairings)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(screenPairings.id, started.pairingId));

      expect(await service.findClaimableByCode(started.code)).toBeNull();
    });

    it('returns null for an unknown code', async () => {
      expect(await service.findClaimableByCode('000000')).toBeNull();
    });
  });

  describe('attachRepairKey', () => {
    it('claims a pending pairing with the new key', async () => {
      const org = await seedOrg();
      const [screen] = await db
        .insert(screens)
        .values({
          organisationId: org.id,
          name: 'S',
          resolution: '1920x1080',
          location: 'L',
          apiKeyHash: '$2b$10$h',
        })
        .returning();
      const started = await service.startPairing();

      const result = await service.attachRepairKey(started.code, screen.id, org.id, 'fresh-key');

      expect(result?.id).toBe(started.pairingId);
      const [row] = await db
        .select()
        .from(screenPairings)
        .where(eq(screenPairings.id, started.pairingId));
      expect(row.status).toBe('claimed');
      expect(row.apiKey).toBe('fresh-key');
    });

    it('returns null when no claimable pairing matches', async () => {
      const org = await seedOrg();
      const [screen] = await db
        .insert(screens)
        .values({
          organisationId: org.id,
          name: 'S',
          resolution: '1920x1080',
          location: 'L',
          apiKeyHash: '$2b$10$h',
        })
        .returning();

      expect(await service.attachRepairKey('000000', screen.id, org.id, 'k')).toBeNull();
    });
  });

  describe('cleanupExpired', () => {
    it('removes expired pending and all consumed pairings, keeps active ones', async () => {
      const active = await service.startPairing();

      const expired = await service.startPairing();
      await db
        .update(screenPairings)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(screenPairings.id, expired.pairingId));

      const consumed = await service.startPairing();
      await db
        .update(screenPairings)
        .set({ status: 'consumed' })
        .where(eq(screenPairings.id, consumed.pairingId));

      const removed = await service.cleanupExpired();

      expect(removed).toBe(2);
      const remaining = await db.select().from(screenPairings);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(active.pairingId);
    });
  });
});
