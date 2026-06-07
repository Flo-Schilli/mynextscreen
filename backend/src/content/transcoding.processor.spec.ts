import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { Job } from 'bullmq';
import { TranscodingProcessor, TranscodeJobData } from './transcoding.processor';
import { Content } from './content.entity';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { StorageService } from '../organisation/storage.service';
import { TRANSCODING_COMPLETED, TRANSCODING_FAILED } from './transcoding.event';

// Mock child_process
const mockOn = jest.fn();
const mockStderrOn = jest.fn();
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ size: 5000 }),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

// Mock ffprobe-duration utility
const mockFfprobeDuration = jest.fn();
jest.mock('./ffprobe-duration.util', () => ({
  ffprobeDuration: (...args: unknown[]) => mockFfprobeDuration(...args),
}));

function createMockJob(overrides: Partial<TranscodeJobData> = {}): Job<TranscodeJobData> {
  return {
    id: 'job-1',
    data: {
      contentId: 'content-1',
      organisationId: 'org-1',
      originalPath: '/tmp/media/org-1/originals/content-1.mp4',
      mimeType: 'video/mp4',
      type: ContentType.Video,
      ...overrides,
    },
    updateProgress: jest.fn().mockResolvedValue(undefined),
  } as unknown as Job<TranscodeJobData>;
}

function setupSpawnSuccess(): void {
  mockSpawn.mockImplementation(() => {
    const proc = {
      stderr: { on: mockStderrOn },
      on: mockOn,
      stdin: null,
      stdout: null,
    };

    // Simulate FFmpeg completing successfully
    setTimeout(() => {
      // Emit some stderr data with duration
      const dataCallback = mockStderrOn.mock.calls.find((c: unknown[]) => c[0] === 'data');
      if (dataCallback) {
        dataCallback[1](
          Buffer.from('  Duration: 00:01:00.00, start: 0.000000, bitrate: 1234 kb/s\n'),
        );
        dataCallback[1](
          Buffer.from(
            'frame=  900 fps= 30 q=28.0 size=    1024kB time=00:00:30.00 bitrate= 279.6kbits/s\n',
          ),
        );
      }
      // Close with success
      const closeCallback = mockOn.mock.calls.find((c: unknown[]) => c[0] === 'close');
      if (closeCallback) {
        closeCallback[1](0);
      }
    }, 10);

    return proc;
  });
}

function setupSpawnFailure(exitCode: number): void {
  mockSpawn.mockImplementation(() => {
    const proc = {
      stderr: { on: mockStderrOn },
      on: mockOn,
      stdin: null,
      stdout: null,
    };

    setTimeout(() => {
      const dataCallback = mockStderrOn.mock.calls.find((c: unknown[]) => c[0] === 'data');
      if (dataCallback) {
        dataCallback[1](Buffer.from('Error: something went wrong\n'));
      }
      const closeCallback = mockOn.mock.calls.find((c: unknown[]) => c[0] === 'close');
      if (closeCallback) {
        closeCallback[1](exitCode);
      }
    }, 10);

    return proc;
  });
}

describe('TranscodingProcessor', () => {
  let processor: TranscodingProcessor;
  let contentRepo: Record<string, jest.Mock>;
  let storageService: Record<string, jest.Mock>;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFfprobeDuration.mockResolvedValue(60);

    contentRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    storageService = {
      checkTranscodedLimit: jest.fn().mockResolvedValue(undefined),
      addTranscodedUsage: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscodingProcessor,
        { provide: getRepositoryToken(Content), useValue: contentRepo },
        { provide: StorageService, useValue: storageService },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: unknown) => {
              if (key === 'MEDIA_BASE_PATH') return '/tmp/test-media';
              if (key === 'FFMPEG_PATH') return 'ffmpeg';
              if (key === 'FFMPEG_VIDEO_CRF') return '18';
              if (key === 'FFMPEG_VIDEO_PRESET') return 'slow';
              if (key === 'FFMPEG_VIDEO_MAXRATE') return '8M';
              if (key === 'FFMPEG_VIDEO_BUFSIZE') return '16M';
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    processor = module.get<TranscodingProcessor>(TranscodingProcessor);
  });

  describe('process — video transcoding', () => {
    it('should set status to processing, then completed on success', async () => {
      setupSpawnSuccess();
      const job = createMockJob();

      await processor.process(job);

      // First call: set to processing
      expect(contentRepo.update).toHaveBeenCalledWith('content-1', {
        transcodingStatus: TranscodingStatus.Processing,
      });

      // Second call: set to completed with transcoded size and duration
      expect(contentRepo.update).toHaveBeenCalledWith('content-1', {
        transcodedSizeBytes: 5000,
        durationSeconds: 60,
        transcodingStatus: TranscodingStatus.Completed,
        transcodingError: null,
      });
    });

    it('should update org storage counter on success', async () => {
      setupSpawnSuccess();
      const job = createMockJob();

      await processor.process(job);

      expect(storageService.checkTranscodedLimit).toHaveBeenCalledWith('org-1', 5000);
      expect(storageService.addTranscodedUsage).toHaveBeenCalledWith('org-1', 5000);
    });

    it('should emit TRANSCODING_COMPLETED event on success', async () => {
      setupSpawnSuccess();
      const job = createMockJob();

      await processor.process(job);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        TRANSCODING_COMPLETED,
        expect.objectContaining({
          contentId: 'content-1',
          organisationId: 'org-1',
          transcodedSizeBytes: 5000,
        }),
      );
    });

    it('should report progress via job.updateProgress', async () => {
      setupSpawnSuccess();
      const job = createMockJob();

      await processor.process(job);

      expect(job.updateProgress).toHaveBeenCalledWith(50);
    });

    it('should spawn ffmpeg with correct video args', async () => {
      setupSpawnSuccess();
      const job = createMockJob();

      await processor.process(job);

      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining([
          '-i',
          job.data.originalPath,
          '-c:v',
          'libx264',
          '-crf',
          '18',
          '-preset',
          'slow',
          '-maxrate',
          '8M',
          '-bufsize',
          '16M',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-movflags',
          '+faststart',
          '-y',
        ]),
        expect.any(Object),
      );
    });

    it('should call ffprobe on the transcoded file for videos', async () => {
      setupSpawnSuccess();
      const job = createMockJob();

      await processor.process(job);

      expect(mockFfprobeDuration).toHaveBeenCalledWith(
        expect.stringContaining('content-1.mp4'),
        'ffprobe',
      );
    });

    it('should save durationSeconds as null when ffprobe fails for video', async () => {
      setupSpawnSuccess();
      mockFfprobeDuration.mockRejectedValue(new Error('ffprobe failed'));
      const job = createMockJob();

      await processor.process(job);

      expect(contentRepo.update).toHaveBeenCalledWith('content-1', {
        transcodedSizeBytes: 5000,
        durationSeconds: null,
        transcodingStatus: TranscodingStatus.Completed,
        transcodingError: null,
      });
    });
  });

  describe('process — image transcoding', () => {
    it('should spawn ffmpeg for image (webp output)', async () => {
      setupSpawnSuccess();
      const job = createMockJob({
        type: ContentType.Image,
        mimeType: 'image/png',
        originalPath: '/tmp/media/org-1/originals/content-1.png',
      });

      await processor.process(job);

      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining(['-i', '/tmp/media/org-1/originals/content-1.png', '-y']),
        expect.any(Object),
      );

      expect(contentRepo.update).toHaveBeenCalledWith(
        'content-1',
        expect.objectContaining({
          transcodingStatus: TranscodingStatus.Completed,
          durationSeconds: null,
        }),
      );
    });

    it('should not call ffprobe for images', async () => {
      setupSpawnSuccess();
      const job = createMockJob({
        type: ContentType.Image,
        mimeType: 'image/png',
        originalPath: '/tmp/media/org-1/originals/content-1.png',
      });

      await processor.process(job);

      expect(mockFfprobeDuration).not.toHaveBeenCalled();
    });
  });

  describe('process — failure handling', () => {
    it('should set status to failed and emit event on FFmpeg error', async () => {
      setupSpawnFailure(1);
      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow('FFmpeg exited with code 1');

      expect(contentRepo.update).toHaveBeenCalledWith('content-1', {
        transcodingStatus: TranscodingStatus.Failed,
        transcodingError: expect.stringContaining('FFmpeg exited with code 1'),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        TRANSCODING_FAILED,
        expect.objectContaining({
          contentId: 'content-1',
          organisationId: 'org-1',
          error: expect.stringContaining('FFmpeg exited with code 1'),
        }),
      );
    });

    it('should not update org storage on failure', async () => {
      setupSpawnFailure(1);
      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow();

      expect(storageService.addTranscodedUsage).not.toHaveBeenCalled();
    });
  });

  describe('process — transcoded storage limit exceeded', () => {
    it('should mark as failed and not save transcoded file when limit exceeded', async () => {
      setupSpawnSuccess();
      storageService.checkTranscodedLimit.mockRejectedValue(
        new BadRequestException(
          'Transcoded file would exceed organisation transcoded storage limit',
        ),
      );
      const job = createMockJob();

      await processor.process(job);

      // Should mark as failed with storage limit error
      expect(contentRepo.update).toHaveBeenCalledWith('content-1', {
        transcodingStatus: TranscodingStatus.Failed,
        transcodingError: 'Transcoded file would exceed organisation transcoded storage limit',
      });

      // Should emit TRANSCODING_FAILED event
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        TRANSCODING_FAILED,
        expect.objectContaining({
          contentId: 'content-1',
          organisationId: 'org-1',
          error: 'Transcoded file would exceed organisation transcoded storage limit',
        }),
      );

      // Should NOT add transcoded usage
      expect(storageService.addTranscodedUsage).not.toHaveBeenCalled();
    });
  });
});
