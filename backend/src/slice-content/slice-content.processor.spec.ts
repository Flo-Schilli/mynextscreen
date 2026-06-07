import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import {
  SliceContentProcessor,
  SliceContentJobData,
} from './slice-content.processor';
import { SlicedRendition } from './sliced-rendition.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { Screen } from '../screen/screen.entity';
import { Playlist } from '../playlist/playlist.entity';
import { Content } from '../content/content.entity';
import { ContentType } from '../content/content-type.enum';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';

// Mock child_process
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock fs/promises
const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockReadFile = jest.fn();
jest.mock('fs/promises', () => ({
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('abc123hash'),
    }),
  }),
}));

function createMockJob(
  overrides: Partial<SliceContentJobData> = {},
): Job<SliceContentJobData> {
  return {
    id: 'job-1',
    data: {
      groupId: 'group-1',
      scheduleId: 'schedule-1',
      playlistId: 'playlist-1',
      organisationId: 'org-1',
      ...overrides,
    },
    updateProgress: jest.fn().mockResolvedValue(undefined),
  } as unknown as Job<SliceContentJobData>;
}

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
        const dataCallback = proc.stdout.on.mock.calls.find(
          (c: unknown[]) => c[0] === 'data',
        );
        if (dataCallback) {
          dataCallback[1](Buffer.from(stdoutData));
        }
      }
      if (!isProbe) {
        const dataCallback = proc.stderr.on.mock.calls.find(
          (c: unknown[]) => c[0] === 'data',
        );
        if (dataCallback) {
          dataCallback[1](Buffer.from('frame=1\n'));
        }
      }
      const closeCallback = proc.on.mock.calls.find(
        (c: unknown[]) => c[0] === 'close',
      );
      if (closeCallback) {
        closeCallback[1](0);
      }
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
        const dataCallback = proc.stdout.on.mock.calls.find(
          (c: unknown[]) => c[0] === 'data',
        );
        if (dataCallback) {
          dataCallback[1](Buffer.from('1920x1080\n'));
        }
      } else {
        const dataCallback = proc.stderr.on.mock.calls.find(
          (c: unknown[]) => c[0] === 'data',
        );
        if (dataCallback) {
          dataCallback[1](Buffer.from('Error: crop failed\n'));
        }
      }
      const closeCallback = proc.on.mock.calls.find(
        (c: unknown[]) => c[0] === 'close',
      );
      if (closeCallback) {
        closeCallback[1](isProbe ? 0 : 1);
      }
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
      const closeCallback = proc.on.mock.calls.find(
        (c: unknown[]) => c[0] === 'close',
      );
      if (closeCallback) {
        closeCallback[1](1); // probe fails
      }
    }, 10);

    return proc;
  });
}

describe('SliceContentProcessor', () => {
  let processor: SliceContentProcessor;
  let renditionRepo: Record<string, jest.Mock>;
  let groupRepo: Record<string, jest.Mock>;
  let screenRepo: Record<string, jest.Mock>;
  let playlistRepo: Record<string, jest.Mock>;
  let contentRepo: Record<string, jest.Mock>;

  const mockGroup: Partial<ScreenGroup> = {
    id: 'group-1',
    organisationId: 'org-1',
    mode: ScreenGroupMode.Split,
    gridColumns: 2,
    gridRows: 2,
  };

  const mockScreens: Partial<Screen>[] = [
    {
      id: 'screen-1',
      organisationId: 'org-1',
      groupId: 'group-1',
      gridRow: 0,
      gridColumn: 0,
    },
    {
      id: 'screen-2',
      organisationId: 'org-1',
      groupId: 'group-1',
      gridRow: 0,
      gridColumn: 1,
    },
  ];

  const mockContent: Partial<Content> = {
    id: 'content-1',
    organisationId: 'org-1',
    type: ContentType.Video,
  };

  const mockPlaylist = {
    id: 'playlist-1',
    organisationId: 'org-1',
    items: [
      {
        id: 'item-1',
        contentId: 'content-1',
        content: mockContent,
        position: 0,
        durationSeconds: 30,
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockReadFile.mockResolvedValue(Buffer.from('file-content'));

    renditionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((data) => ({ id: 'rendition-1', ...data })),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    };

    groupRepo = {
      findOne: jest.fn().mockResolvedValue(mockGroup),
    };

    screenRepo = {
      find: jest.fn().mockResolvedValue(mockScreens),
    };

    playlistRepo = {
      findOne: jest.fn().mockResolvedValue(mockPlaylist),
    };

    contentRepo = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SliceContentProcessor,
        {
          provide: getRepositoryToken(SlicedRendition),
          useValue: renditionRepo,
        },
        { provide: getRepositoryToken(ScreenGroup), useValue: groupRepo },
        { provide: getRepositoryToken(Screen), useValue: screenRepo },
        { provide: getRepositoryToken(Playlist), useValue: playlistRepo },
        { provide: getRepositoryToken(Content), useValue: contentRepo },
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

  describe('process — successful slicing', () => {
    it('should slice content for all screens in the group', async () => {
      setupSpawnSuccess('1920x1080\n');
      const job = createMockJob();

      await processor.process(job);

      expect(renditionRepo.create).toHaveBeenCalledTimes(2);
      expect(renditionRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should call ffmpeg with correct crop filter for each screen', async () => {
      setupSpawnSuccess('1920x1080\n');
      const job = createMockJob();

      await processor.process(job);

      // FFmpeg: 1 probe + 2 crops
      expect(mockSpawn).toHaveBeenCalledTimes(3);

      // First crop (screen at 0,0)
      const secondCall = mockSpawn.mock.calls[1];
      expect(secondCall[0]).toBe('ffmpeg');
      expect(secondCall[1]).toContain('-vf');
      expect(secondCall[1]).toContain('crop=960:540:0:0');

      // Second crop (screen at 0,1)
      const thirdCall = mockSpawn.mock.calls[2];
      expect(thirdCall[1]).toContain('crop=960:540:960:0');
    });

    it('should update progress as slices complete', async () => {
      setupSpawnSuccess('1920x1080\n');
      const job = createMockJob();

      await processor.process(job);

      expect(job.updateProgress).toHaveBeenCalledWith(50); // 1/2
      expect(job.updateProgress).toHaveBeenCalledWith(100); // 2/2
    });

    it('should store rendition with correct output path', async () => {
      setupSpawnSuccess('1920x1080\n');
      const job = createMockJob();

      await processor.process(job);

      expect(renditionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organisationId: 'org-1',
          groupId: 'group-1',
          screenId: 'screen-1',
          contentItemId: 'content-1',
          sourceHash: 'abc123hash',
          filePath: expect.stringContaining(
            'slices/group-1/screen-1/content-1.mp4',
          ),
        }),
      );
    });

    it('should create output directories', async () => {
      setupSpawnSuccess('1920x1080\n');
      const job = createMockJob();

      await processor.process(job);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('slices/group-1/screen-1'),
        { recursive: true },
      );
    });
  });

  describe('process — idempotency', () => {
    it('should skip slicing when rendition exists with same source hash', async () => {
      setupSpawnSuccess('1920x1080\n');
      renditionRepo.findOne.mockResolvedValue({
        id: 'existing-rendition',
        sourceHash: 'abc123hash',
        groupId: 'group-1',
        screenId: 'screen-1',
        contentItemId: 'content-1',
      });

      const job = createMockJob();
      await processor.process(job);

      expect(renditionRepo.create).not.toHaveBeenCalled();
    });

    it('should re-slice when source hash differs', async () => {
      setupSpawnSuccess('1920x1080\n');
      renditionRepo.findOne.mockResolvedValue({
        id: 'existing-rendition',
        sourceHash: 'old-hash',
        groupId: 'group-1',
        screenId: 'screen-1',
        contentItemId: 'content-1',
        filePath: '/old/path',
      });

      const job = createMockJob();
      await processor.process(job);

      // Should update existing renditions (not create new ones)
      expect(renditionRepo.save).toHaveBeenCalled();
      const savedEntity = renditionRepo.save.mock.calls[0][0];
      expect(savedEntity.sourceHash).toBe('abc123hash');
    });
  });

  describe('process — edge cases', () => {
    it('should throw when group is not found', async () => {
      groupRepo.findOne.mockResolvedValue(null);
      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow(
        'Group group-1 not found or missing grid configuration',
      );
    });

    it('should throw when group has no grid configuration', async () => {
      groupRepo.findOne.mockResolvedValue({
        id: 'group-1',
        organisationId: 'org-1',
        gridColumns: null,
        gridRows: null,
      });
      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow(
        'Group group-1 not found or missing grid configuration',
      );
    });

    it('should return early when no screens in group', async () => {
      screenRepo.find.mockResolvedValue([]);
      const job = createMockJob();

      await processor.process(job);

      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should return early when playlist is not found', async () => {
      playlistRepo.findOne.mockResolvedValue(null);
      const job = createMockJob();

      await processor.process(job);

      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should return early when playlist has no items', async () => {
      playlistRepo.findOne.mockResolvedValue({ id: 'playlist-1', items: [] });
      const job = createMockJob();

      await processor.process(job);

      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should skip screens without grid positions', async () => {
      setupSpawnSuccess('1920x1080\n');
      screenRepo.find.mockResolvedValue([
        {
          id: 'screen-1',
          organisationId: 'org-1',
          groupId: 'group-1',
          gridRow: null,
          gridColumn: null,
        },
      ]);

      const job = createMockJob();
      await processor.process(job);

      expect(renditionRepo.create).not.toHaveBeenCalled();
    });

    it('should skip content items with no content', async () => {
      setupSpawnSuccess('1920x1080\n');
      playlistRepo.findOne.mockResolvedValue({
        id: 'playlist-1',
        items: [{ id: 'item-1', content: null }],
      });

      const job = createMockJob();
      await processor.process(job);

      expect(renditionRepo.create).not.toHaveBeenCalled();
      expect(job.updateProgress).toHaveBeenCalledWith(100);
    });

    it('should skip content when probe resolution fails', async () => {
      setupProbeFailure();

      const job = createMockJob();
      await processor.process(job);

      expect(renditionRepo.create).not.toHaveBeenCalled();
      expect(job.updateProgress).toHaveBeenCalledWith(100);
    });
  });

  describe('process — FFmpeg failure', () => {
    it('should throw when FFmpeg crop exits with non-zero code', async () => {
      setupSpawnFailure();
      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow(
        'FFmpeg exited with code 1',
      );
    });
  });

  describe('process — image slicing', () => {
    it('should slice images using FFmpeg crop with webp extension', async () => {
      setupSpawnSuccess('800x600\n');
      const imageContent = { ...mockContent, type: ContentType.Image };
      playlistRepo.findOne.mockResolvedValue({
        id: 'playlist-1',
        organisationId: 'org-1',
        items: [
          {
            id: 'item-1',
            contentId: 'content-1',
            content: imageContent,
            position: 0,
            durationSeconds: 10,
          },
        ],
      });

      const job = createMockJob();
      await processor.process(job);

      expect(mockSpawn).toHaveBeenCalledTimes(3); // 1 probe + 2 crops
      expect(renditionRepo.create).toHaveBeenCalledTimes(2);

      // Check output path uses .webp extension
      expect(renditionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: expect.stringContaining('.webp'),
        }),
      );
    });

    it('should use correct crop for image at non-square resolution', async () => {
      setupSpawnSuccess('800x600\n');
      screenRepo.find.mockResolvedValue([
        {
          id: 'screen-1',
          organisationId: 'org-1',
          groupId: 'group-1',
          gridRow: 1,
          gridColumn: 1,
        },
      ]);
      const imageContent = { ...mockContent, type: ContentType.Image };
      playlistRepo.findOne.mockResolvedValue({
        id: 'playlist-1',
        organisationId: 'org-1',
        items: [
          {
            id: 'item-1',
            contentId: 'content-1',
            content: imageContent,
            position: 0,
          },
        ],
      });

      const job = createMockJob();
      await processor.process(job);

      // 800/2=400, 600/2=300, at (1,1): crop=400:300:400:300
      const cropCall = mockSpawn.mock.calls[1]; // second call is the crop
      expect(cropCall[1]).toContain('crop=400:300:400:300');
    });
  });

  describe('process — multiple content items', () => {
    it('should process all items in the playlist', async () => {
      setupSpawnSuccess('1920x1080\n');
      playlistRepo.findOne.mockResolvedValue({
        id: 'playlist-1',
        organisationId: 'org-1',
        items: [
          {
            id: 'item-1',
            contentId: 'content-1',
            content: { ...mockContent, id: 'content-1' },
            position: 0,
          },
          {
            id: 'item-2',
            contentId: 'content-2',
            content: { ...mockContent, id: 'content-2' },
            position: 1,
          },
        ],
      });

      const job = createMockJob();
      await processor.process(job);

      // 2 items * 2 screens = 4 renditions, plus 2 probes
      expect(renditionRepo.create).toHaveBeenCalledTimes(4);
      expect(mockSpawn).toHaveBeenCalledTimes(6); // 2 probes + 4 crops
    });
  });

  describe('process — file hash for idempotency', () => {
    it('should handle file hash computation failure gracefully', async () => {
      setupSpawnSuccess('1920x1080\n');
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const job = createMockJob();
      await processor.process(job);

      // Should still create renditions (with empty hash)
      expect(renditionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceHash: expect.any(String),
        }),
      );
    });
  });
});
