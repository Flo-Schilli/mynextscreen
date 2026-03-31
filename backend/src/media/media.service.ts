import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface MediaFileInfo {
  filePath: string;
  contentType: string;
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

@Injectable()
export class MediaService {
  private readonly mediaBasePath: string;

  constructor(private readonly configService: ConfigService) {
    this.mediaBasePath = this.configService.get<string>(
      'MEDIA_BASE_PATH',
      './data/media',
    );
  }

  async getTranscodedFile(
    organisationId: string,
    contentId: string,
  ): Promise<MediaFileInfo> {
    const transcodedDir = path.join(
      this.mediaBasePath,
      organisationId,
      'transcoded',
    );

    const filePath = await this.findFile(transcodedDir, contentId);
    if (!filePath) {
      throw new NotFoundException(
        'Content not found or transcoding not complete',
      );
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPE_MAP[ext] || 'application/octet-stream';

    return { filePath, contentType };
  }

  private async findFile(
    directory: string,
    contentId: string,
  ): Promise<string | null> {
    try {
      const entries = await fs.promises.readdir(directory);
      const match = entries.find((entry) => {
        const name = path.parse(entry).name;
        return name === contentId;
      });
      return match ? path.join(directory, match) : null;
    } catch {
      return null;
    }
  }
}
