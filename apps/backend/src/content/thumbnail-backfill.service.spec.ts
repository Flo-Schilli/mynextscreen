import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ThumbnailBackfillService } from './thumbnail-backfill.service';
import { DRIZZLE } from '../db/database.constants';
import { contents, organisations, type Organisation } from '../db/schema';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { THUMBNAIL_JOB } from './transcoding.processor';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('ThumbnailBackfillService', () => {
  let service: ThumbnailBackfillService;
  let db: DrizzleDB;
  let addBulk: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    addBulk = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThumbnailBackfillService,
        { provide: DRIZZLE, useValue: db },
        { provide: getQueueToken('transcoding'), useValue: { addBulk } },
      ],
    }).compile();

    service = module.get<ThumbnailBackfillService>(ThumbnailBackfillService);
  });

  async function seedOrg(): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    return org;
  }

  async function seedContent(
    organisationId: string,
    status: TranscodingStatus,
    thumbnailSizeBytes: number | null,
  ): Promise<string> {
    const [row] = await db
      .insert(contents)
      .values({
        organisationId,
        title: 'Seed',
        tags: [],
        type: ContentType.Image,
        originalFilename: 'i.png',
        originalMimeType: 'image/png',
        originalSizeBytes: 1000,
        transcodingStatus: status,
        thumbnailSizeBytes,
      })
      .returning();
    return row.id;
  }

  it('enqueues a thumbnail job for completed content without a thumbnail', async () => {
    const org = await seedOrg();
    const id = await seedContent(org.id, TranscodingStatus.Completed, null);

    await service.onApplicationBootstrap();

    expect(addBulk).toHaveBeenCalledTimes(1);
    expect(addBulk).toHaveBeenCalledWith([
      { name: THUMBNAIL_JOB, data: { contentId: id, organisationId: org.id } },
    ]);
  });

  it('skips content that already has a thumbnail or is not completed', async () => {
    const org = await seedOrg();
    await seedContent(org.id, TranscodingStatus.Completed, 123); // has thumbnail
    await seedContent(org.id, TranscodingStatus.Pending, null); // not completed
    await seedContent(org.id, TranscodingStatus.Failed, null); // failed

    await service.onApplicationBootstrap();

    expect(addBulk).not.toHaveBeenCalled();
  });

  it('does not enqueue anything when there is no content', async () => {
    await service.onApplicationBootstrap();
    expect(addBulk).not.toHaveBeenCalled();
  });

  it('swallows queue errors so bootstrap never fails', async () => {
    const org = await seedOrg();
    await seedContent(org.id, TranscodingStatus.Completed, null);
    addBulk.mockRejectedValueOnce(new Error('redis down'));

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
  });
});
