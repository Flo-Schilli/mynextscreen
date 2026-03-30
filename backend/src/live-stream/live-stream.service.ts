import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { LiveStream } from './live-stream.entity';
import { LiveStreamStatus } from './live-stream-status.enum';
import { CreateLiveStreamDto } from './dto/create-live-stream.dto';
import { UpdateLiveStreamDto } from './dto/update-live-stream.dto';

@Injectable()
export class LiveStreamService extends OrganisationScopedService<LiveStream> {
  constructor(
    @InjectRepository(LiveStream)
    repository: Repository<LiveStream>,
  ) {
    super(repository, 'LiveStream');
  }

  async createLiveStream(
    organisationId: string,
    dto: CreateLiveStreamDto,
  ): Promise<LiveStream> {
    return this.create(organisationId, dto);
  }

  async updateLiveStream(
    organisationId: string,
    id: string,
    dto: UpdateLiveStreamDto,
  ): Promise<LiveStream> {
    const stream = await this.findOne(organisationId, id);

    if (stream.status === LiveStreamStatus.Active) {
      throw new ConflictException(
        'Cannot update a live stream that is currently active. Deactivate the stream first.',
      );
    }

    Object.assign(stream, dto);
    return this.repository.save(stream);
  }

  async removeLiveStream(organisationId: string, id: string): Promise<void> {
    const stream = await this.findOne(organisationId, id);

    if (stream.status === LiveStreamStatus.Active) {
      throw new ConflictException(
        'Cannot delete a live stream that is currently active. Deactivate the stream first.',
      );
    }

    await this.repository.remove(stream);
  }
}
