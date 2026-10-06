import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SliceStatusService } from './slice-status.service';
import { eq } from 'drizzle-orm';
import { Job } from 'bullmq';
import { SliceContentProcessor, SliceContentJobData } from './slice-content.processor';
import { JobMetricsService } from '../observability/job-metrics.service';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  screenGroups,
  screens,
  contents,
  playlists,
  playlistItems,
  slicedRenditions,
} from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { TranscodingStatus } from '../content/transcoding-status.enum';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

// Mock child_process
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock fs/promises (preserve real module for the Drizzle migrator in the harness)
const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockReadFile = jest.fn();
jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

// Mock crypto's createHash (preserve the rest of the module)
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('abc123hash'),
    }),
  }),
}));

function setupSpawnSuccess(stdoutData?: string): void {
  mockSpawn.mockImplementation((_cmd: string, args: string[]) => {
    const isProbe = args.includes('-show_entries');
    const proc = {
      stderr: { on: jest.fn() },
      stdout: { on: jest.fn() },
      on: jest.fn(),
      stdin: null,
    };
    setTimeout(() => {
      if (isProbe && stdoutData) {
        const dataCallback = proc.stdout.on.mock.calls.find((c: unknown[]) => c[0] === 'data');
        if (dataCallback) dataCallback[1](Buffer.from(stdoutData));
      }
      if (!isProbe) {
        const dataCallback = proc.stderr.on.mock.calls.find((c: unknown[]) => c[0] === 'data');
        if (dataCallback) dataCallback[1](Buffer.from('frame=1\n'));
      }
      const closeCallback = proc.on.mock.calls.find((c: unknown[]) => c[0] === 'close');
      if (closeCallback) closeCallback[1](0);
    }, 10);
    return proc;
  });
}

function setupSpawnFailure(): void {
  mockSpawn.mockImplementation((_cmd: string, args: string[]) => {
    const isProbe = args.includes('-show_entries');
    const proc = {
      stderr: { on: jest.fn() },
      stdout: { on: jest.fn() },
      on: jest.fn(),
      stdin: null,
    };
    setTimeout(() => {
      if (isProbe) {
        const dataCallback = proc.stdout.on.mock.calls.find((c: unknown[]) => c[0] === 'data');
        if (dataCallback) dataCallback[1](Buffer.from('1920x1080\n'));
      } else {
        const dataCallback = proc.stderr.on.mock.calls.find((c: unknown[]) => c[0] === 'data');
        if (dataCallback) dataCallback[1](Buffer.from('Error: crop failed\n'));
      }
      const closeCallback = proc.on.mock.calls.find((c: unknown[]) => c[0] === 'close');
      if (closeCallback) closeCallback[1](isProbe ? 0 : 1);
    }, 10);
    return proc;
  });
}

function setupProbeFailure(): void {
  mockSpawn.mockImplementation((_cmd: string, _args: string[]) => {
    const proc = {
      stderr: { on: jest.fn() },
      stdout: { on: jest.fn() },
      on: jest.fn(),
      stdin: null,
    };
    setTimeout(() => {
      const closeCallback = proc.on.mock.calls.find((c: unknown[]) => c[0] === 'close');
      if (closeCallback) closeCallback[1](1); // probe fails
    }, 10);
    return proc;
  });
}

describe('SliceContentProcessor', () => {
  let processor: SliceContentProcessor;
  let db: DrizzleDB;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(Buffer.from('file-content'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SliceContentProcessor,
        SliceStatusService,
        { provide: DRIZZLE, useValue: db },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: JobMetricsService,
          useValue: { recordCompleted: jest.fn(), recordFailed: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: unknown) => {
              if (key === 'MEDIA_BASE_PATH') return '/tmp/test-media';
              if (key === 'FFMPEG_PATH') return 'ffmpeg';
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    processor = module.get<SliceContentProcessor>(SliceContentProcessor);
  });

  interface Seeded {
    orgId: string;
    groupId: string;
    playlistId: string;
    screenIds: string[];
    contentIds: string[];
  }

  /**
   * Seed a split group (2x2) with the given screen grid positions and a playlist
   * whose items reference the given content types, in order.
   */
  async function seedScenario(opts: {
    gridColumns?: number | null;
    gridRows?: number | null;
    screenPositions?: Array<{ gridRow: number | null; gridColumn: number | null }>;
    contentTypes?: ContentType[];
  }): Promise<Seeded> {
    const {
      gridColumns = 2,
      gridRows = 2,
      screenPositions = [
        { gridRow: 0, gridColumn: 0 },
        { gridRow: 0, gridColumn: 1 },
      ],
      contentTypes = [ContentType.Video],
    } = opts;

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    const [group] = await db
      .insert(screenGroups)
      .values({
        organisationId: org.id,
        name: 'G',
        mode: ScreenGroupMode.Split,
        gridColumns,
        gridRows,
      })
      .returning();

    const screenIds: string[] = [];
    for (const pos of screenPositions) {
      const [screen] = await db
        .insert(screens)
        .values({
          organisationId: org.id,
          name: `S${screenIds.length}`,
          resolution: '1920x1080',
          location: 'L',
          apiKeyHash: `h${screenIds.length}`,
          groupId: group.id,
          gridRow: pos.gridRow,
          gridColumn: pos.gridColumn,
        })
        .returning();
      screenIds.push(screen.id);
    }

    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId: org.id, name: 'PL' })
      .returning();

    const contentIds: string[] = [];
    let position = 0;
    for (const type of contentTypes) {
      const [content] = await db
        .insert(contents)
        .values({
          organisationId: org.id,
          title: `C${position}`,
          tags: [],
          type,
          originalFilename: type === ContentType.Video ? 'v.mp4' : 'i.png',
          originalMimeType: type === ContentType.Video ? 'video/mp4' : 'image/png',
          originalSizeBytes: 1,
          transcodingStatus: TranscodingStatus.Completed,
        })
        .returning();
      contentIds.push(content.id);
      await db.insert(playlistItems).values({
        playlistId: playlist.id,
        contentId: content.id,
        position,
        durationSeconds: 10,
      });
      position++;
    }

    return { orgId: org.id, groupId: group.id, playlistId: playlist.id, screenIds, contentIds };
  }

  function createJob(seeded: Seeded): Job<SliceContentJobData> {
    return {
      id: 'job-1',
      data: {
        groupId: seeded.groupId,
        scheduleId: 'schedule-1',
        playlistId: seeded.playlistId,
        organisationId: seeded.orgId,
      },
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job<SliceContentJobData>;
  }

  async function renditionCount(): Promise<number> {
    const rows = await db.select().from(slicedRenditions);
    return rows.length;
  }

  describe('process — successful slicing', () => {
    it('should slice content for all screens in the group', async () => {
      const seeded = await seedScenario({});
      setupSpawnSuccess('1920x1080\n');

      await processor.process(createJob(seeded));

      expect(await renditionCount()).toBe(2);
    });

    it('should call ffmpeg with correct crop filter for each screen', async () => {
      const seeded = await seedScenario({});
      setupSpawnSuccess('1920x1080\n');

      await processor.process(createJob(seeded));

      // FFmpeg: 1 probe + 2 crops
      expect(mockSpawn).toHaveBeenCalledTimes(3);
      const secondCall = mockSpawn.mock.calls[1];
      expect(secondCall[0]).toBe('ffmpeg');
      expect(secondCall[1]).toContain('-vf');
      expect(secondCall[1]).toContain('crop=960:540:0:0');
      const thirdCall = mockSpawn.mock.calls[2];
      expect(thirdCall[1]).toContain('crop=960:540:960:0');
    });

    it('should update progress as slices complete', async () => {
      const seeded = await seedScenario({});
      setupSpawnSuccess('1920x1080\n');
      const job = createJob(seeded);

      await processor.process(job);

      expect(job.updateProgress).toHaveBeenCalledWith(50); // 1/2
      expect(job.updateProgress).toHaveBeenCalledWith(100); // 2/2
    });

    it('should store rendition with correct output path and hash', async () => {
      const seeded = await seedScenario({});
      setupSpawnSuccess('1920x1080\n');

      await processor.process(createJob(seeded));

      const [rendition] = await db
        .select()
        .from(slicedRenditions)
        .where(eq(slicedRenditions.screenId, seeded.screenIds[0]));
      expect(rendition.organisationId).toBe(seeded.orgId);
      expect(rendition.groupId).toBe(seeded.groupId);
      expect(rendition.contentItemId).toBe(seeded.contentIds[0]);
      expect(rendition.sourceHash).toBe('abc123hash');
      expect(rendition.filePath).toContain(
        `slices/${seeded.groupId}/${seeded.screenIds[0]}/${seeded.contentIds[0]}.mp4`,
      );
    });

    it('should create output directories', async () => {
      const seeded = await seedScenario({});
      setupSpawnSuccess('1920x1080\n');

      await processor.process(createJob(seeded));

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining(`slices/${seeded.groupId}/${seeded.screenIds[0]}`),
        { recursive: true },
      );
    });
  });

  describe('process — idempotency', () => {
    it('should skip slicing when rendition exists with same source hash', async () => {
      const seeded = await seedScenario({});
      setupSpawnSuccess('1920x1080\n');
      // Pre-seed a matching rendition for screen-0 with the same hash
      await db.insert(slicedRenditions).values({
        organisationId: seeded.orgId,
        groupId: seeded.groupId,
        screenId: seeded.screenIds[0],
        contentItemId: seeded.contentIds[0],
        filePath: '/existing/path',
        sourceHash: 'abc123hash',
      });

      await processor.process(createJob(seeded));

      // Screen-0 skipped (still its old path), screen-1 created → total 2
      expect(await renditionCount()).toBe(2);
      const [unchanged] = await db
        .select()
        .from(slicedRenditions)
        .where(eq(slicedRenditions.screenId, seeded.screenIds[0]));
      expect(unchanged.filePath).toBe('/existing/path');
    });

    it('should re-slice when source hash differs', async () => {
      const seeded = await seedScenario({});
      setupSpawnSuccess('1920x1080\n');
      await db.insert(slicedRenditions).values({
        organisationId: seeded.orgId,
        groupId: seeded.groupId,
        screenId: seeded.screenIds[0],
        contentItemId: seeded.contentIds[0],
        filePath: '/old/path',
        sourceHash: 'old-hash',
      });

      await processor.process(createJob(seeded));

      const [updated] = await db
        .select()
        .from(slicedRenditions)
        .where(eq(slicedRenditions.screenId, seeded.screenIds[0]));
      expect(updated.sourceHash).toBe('abc123hash');
      expect(updated.filePath).not.toBe('/old/path');
    });
  });

  describe('process — edge cases', () => {
    it('should throw when group is not found', async () => {
      const seeded = await seedScenario({});
      const job = {
        id: 'job-1',
        data: {
          groupId: '00000000-0000-0000-0000-000000000000',
          scheduleId: 's',
          playlistId: seeded.playlistId,
          organisationId: seeded.orgId,
        },
        updateProgress: jest.fn(),
      } as unknown as Job<SliceContentJobData>;

      await expect(processor.process(job)).rejects.toThrow(
        'not found or missing grid configuration',
      );
    });

    it('should throw when group has no grid configuration', async () => {
      const seeded = await seedScenario({ gridColumns: null, gridRows: null });

      await expect(processor.process(createJob(seeded))).rejects.toThrow(
        'not found or missing grid configuration',
      );
    });

    it('should return early when no screens in group', async () => {
      const seeded = await seedScenario({ screenPositions: [] });
      setupSpawnSuccess('1920x1080\n');

      await processor.process(createJob(seeded));

      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should return early when playlist is not found', async () => {
      const seeded = await seedScenario({});
      setupSpawnSuccess('1920x1080\n');
      const job = {
        id: 'job-1',
        data: {
          groupId: seeded.groupId,
          scheduleId: 's',
          playlistId: '00000000-0000-0000-0000-000000000000',
          organisationId: seeded.orgId,
        },
        updateProgress: jest.fn(),
      } as unknown as Job<SliceContentJobData>;

      await processor.process(job);

      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should return early when playlist has no items', async () => {
      const [org] = await db
        .insert(organisations)
        .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
        .returning();
      const [group] = await db
        .insert(screenGroups)
        .values({
          organisationId: org.id,
          name: 'G',
          mode: ScreenGroupMode.Split,
          gridColumns: 2,
          gridRows: 2,
        })
        .returning();
      await db.insert(screens).values({
        organisationId: org.id,
        name: 'S',
        resolution: '1920x1080',
        location: 'L',
        apiKeyHash: 'h',
        groupId: group.id,
        gridRow: 0,
        gridColumn: 0,
      });
      const [playlist] = await db
        .insert(playlists)
        .values({ organisationId: org.id, name: 'Empty' })
        .returning();
      setupSpawnSuccess('1920x1080\n');

      await processor.process({
        id: 'job-1',
        data: {
          groupId: group.id,
          scheduleId: 's',
          playlistId: playlist.id,
          organisationId: org.id,
        },
        updateProgress: jest.fn(),
      } as unknown as Job<SliceContentJobData>);

      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should skip screens without grid positions', async () => {
      const seeded = await seedScenario({
        screenPositions: [{ gridRow: null, gridColumn: null }],
      });
      setupSpawnSuccess('1920x1080\n');

      await processor.process(createJob(seeded));

      expect(await renditionCount()).toBe(0);
    });

    it('should skip content when probe resolution fails', async () => {
      const seeded = await seedScenario({});
      setupProbeFailure();
      const job = createJob(seeded);

      await processor.process(job);

      expect(await renditionCount()).toBe(0);
      expect(job.updateProgress).toHaveBeenCalledWith(100);
    });
  });

  describe('process — FFmpeg failure', () => {
    it('should throw when FFmpeg crop exits with non-zero code', async () => {
      const seeded = await seedScenario({});
      setupSpawnFailure();

      await expect(processor.process(createJob(seeded))).rejects.toThrow(
        'FFmpeg exited with code 1',
      );
    });
  });

  describe('process — image slicing', () => {
    it('should slice images using FFmpeg crop with webp extension', async () => {
      const seeded = await seedScenario({ contentTypes: [ContentType.Image] });
      setupSpawnSuccess('800x600\n');

      await processor.process(createJob(seeded));

      expect(mockSpawn).toHaveBeenCalledTimes(3); // 1 probe + 2 crops
      expect(await renditionCount()).toBe(2);
      const [rendition] = await db.select().from(slicedRenditions);
      expect(rendition.filePath).toContain('.webp');
    });

    it('should use correct crop for image at non-square resolution', async () => {
      const seeded = await seedScenario({
        contentTypes: [ContentType.Image],
        screenPositions: [{ gridRow: 1, gridColumn: 1 }],
      });
      setupSpawnSuccess('800x600\n');

      await processor.process(createJob(seeded));

      // 800/2=400, 600/2=300, at (1,1): crop=400:300:400:300
      const cropCall = mockSpawn.mock.calls[1]; // second call is the crop
      expect(cropCall[1]).toContain('crop=400:300:400:300');
    });
  });

  describe('process — multiple content items', () => {
    it('should process all items in the playlist', async () => {
      const seeded = await seedScenario({
        contentTypes: [ContentType.Video, ContentType.Video],
      });
      setupSpawnSuccess('1920x1080\n');

      await processor.process(createJob(seeded));

      // 2 items * 2 screens = 4 renditions
      expect(await renditionCount()).toBe(4);
      // 2 probes + 4 crops
      expect(mockSpawn).toHaveBeenCalledTimes(6);
    });
  });

  describe('process — file hash for idempotency', () => {
    it('should handle file hash computation failure gracefully', async () => {
      const seeded = await seedScenario({});
      setupSpawnSuccess('1920x1080\n');
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      await processor.process(createJob(seeded));

      // Still creates renditions (with empty hash)
      const rows = await db.select().from(slicedRenditions);
      expect(rows.length).toBe(2);
      expect(typeof rows[0].sourceHash).toBe('string');
    });
  });
});
