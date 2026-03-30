import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { LiveStream } from './live-stream.entity';

@Injectable()
export class LiveStreamService extends OrganisationScopedService<LiveStream> {
  constructor(
    @InjectRepository(LiveStream)
    repository: Repository<LiveStream>,
  ) {
    super(repository, 'LiveStream');
  }
}
