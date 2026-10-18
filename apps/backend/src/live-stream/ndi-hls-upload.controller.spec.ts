import {
  BadRequestException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { AgentAuthenticatedRequest } from '../auth/agent-auth.guard';
import { NdiHlsUploadController } from './ndi-hls-upload.controller';
import type { LiveStreamService } from './live-stream.service';
import type { NdiHlsStorageService } from './ndi-hls-storage.service';

describe('NdiHlsUploadController', () => {
  const req = {
    agentId: 'agent-1',
    organisationId: 'org-1',
  } as unknown as AgentAuthenticatedRequest;
  const TS = 'video/mp2t';
  const streamId = '660e8400-e29b-41d4-a716-446655440000';
  let streams: { findActiveNdiStreamForAgent: jest.Mock };
  let storage: { write: jest.Mock; remove: jest.Mock };
  let controller: NdiHlsUploadController;

  beforeEach(() => {
    streams = { findActiveNdiStreamForAgent: jest.fn().mockResolvedValue({}) };
    storage = { write: jest.fn().mockResolvedValue(undefined), remove: jest.fn() };
    controller = new NdiHlsUploadController(
      streams as unknown as LiveStreamService,
      storage as unknown as NdiHlsStorageService,
    );
  });

  describe('upload', () => {
    it('scopes to org and agent from the token, then stores the body', async () => {
      const body = Buffer.from('ts');

      await controller.upload(req, streamId, 'seg_1.ts', body, TS);

      expect(streams.findActiveNdiStreamForAgent).toHaveBeenCalledWith(
        'org-1',
        'agent-1',
        streamId,
      );
      expect(storage.write).toHaveBeenCalledWith(streamId, 'seg_1.ts', body);
    });

    it('stores nothing when the stream is not the agent’s active NDI stream', async () => {
      streams.findActiveNdiStreamForAgent.mockRejectedValue(new NotFoundException());

      await expect(
        controller.upload(req, streamId, 'seg_1.ts', Buffer.from('x'), TS),
      ).rejects.toThrow(NotFoundException);
      expect(storage.write).not.toHaveBeenCalled();
    });

    it('rejects a body that was not parsed as bytes', async () => {
      await expect(controller.upload(req, streamId, 'seg_1.ts', {}, TS)).rejects.toThrow(
        UnsupportedMediaTypeException,
      );
      expect(storage.write).not.toHaveBeenCalled();
    });

    it('accepts the playlist with its own content type, ignoring parameters', async () => {
      const body = Buffer.from('#EXTM3U');

      await controller.upload(
        req,
        streamId,
        'index.m3u8',
        body,
        'Application/vnd.apple.mpegurl; charset=utf-8',
      );

      expect(storage.write).toHaveBeenCalledWith(streamId, 'index.m3u8', body);
    });

    it.each([
      ['seg_1.ts', 'application/vnd.apple.mpegurl'],
      ['index.m3u8', 'video/mp2t'],
      ['seg_1.ts', 'application/octet-stream'],
      ['seg_1.ts', undefined],
    ])('rejects %s sent as %s with 415', async (filename, contentType) => {
      await expect(
        controller.upload(req, streamId, filename, Buffer.from('x'), contentType),
      ).rejects.toThrow(UnsupportedMediaTypeException);
      expect(storage.write).not.toHaveBeenCalled();
    });

    it('rejects an empty body', async () => {
      await expect(
        controller.upload(req, streamId, 'seg_1.ts', Buffer.alloc(0), TS),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('scopes and deletes', async () => {
      await controller.remove(req, streamId, 'seg_1.ts');

      expect(streams.findActiveNdiStreamForAgent).toHaveBeenCalledWith(
        'org-1',
        'agent-1',
        streamId,
      );
      expect(storage.remove).toHaveBeenCalledWith(streamId, 'seg_1.ts');
    });

    it('deletes nothing for a foreign stream', async () => {
      streams.findActiveNdiStreamForAgent.mockRejectedValue(new NotFoundException());

      await expect(controller.remove(req, streamId, 'seg_1.ts')).rejects.toThrow(NotFoundException);
      expect(storage.remove).not.toHaveBeenCalled();
    });
  });
});
