import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screen } from '../screen/screen.entity';
import { Content } from '../content/content.entity';
import { Playlist } from '../playlist/playlist.entity';
import { ScheduleEntry } from '../schedule/schedule-entry.entity';
import { SearchResultsDto, SearchResultItemDto } from './dto/search-results.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(ScheduleEntry)
    private readonly scheduleEntryRepository: Repository<ScheduleEntry>,
  ) {}

  async search(query: string, organisationId: string): Promise<SearchResultsDto> {
    const trimmed = query.trim();
    if (trimmed === '') {
      return { screens: [], content: [], playlists: [], schedules: [] };
    }

    const sanitised = this.sanitiseLikePattern(trimmed);
    const likePattern = `%${sanitised}%`;

    const [screens, content, playlists, schedules] = await Promise.all([
      this.searchScreens(likePattern, organisationId),
      this.searchContent(likePattern, organisationId),
      this.searchPlaylists(likePattern, organisationId),
      this.searchSchedules(likePattern, organisationId),
    ]);

    return { screens, content, playlists, schedules };
  }

  private sanitiseLikePattern(query: string): string {
    return query.replace(/[%_]/g, '\\$&');
  }

  private async searchScreens(
    likePattern: string,
    organisationId: string,
  ): Promise<SearchResultItemDto[]> {
    const results = await this.screenRepository
      .createQueryBuilder('screen')
      .where('screen.organisationId = :orgId', { orgId: organisationId })
      .andWhere('(LOWER(screen.name) LIKE LOWER(:q) OR LOWER(screen.location) LIKE LOWER(:q))', {
        q: likePattern,
      })
      .take(5)
      .getMany();

    return results.map((s) => ({
      id: s.id,
      type: 'screen' as const,
      label: s.name,
      url: `/screens/${s.id}`,
    }));
  }

  private async searchContent(
    likePattern: string,
    organisationId: string,
  ): Promise<SearchResultItemDto[]> {
    const results = await this.contentRepository
      .createQueryBuilder('content')
      .where('content.organisationId = :orgId', { orgId: organisationId })
      .andWhere(
        '(LOWER(content.title) LIKE LOWER(:q) OR LOWER(content.description) LIKE LOWER(:q) OR LOWER(content.tags) LIKE LOWER(:q))',
        { q: likePattern },
      )
      .take(5)
      .getMany();

    return results.map((c) => ({
      id: c.id,
      type: 'content' as const,
      label: c.title,
      url: `/content/${c.id}`,
    }));
  }

  private async searchPlaylists(
    likePattern: string,
    organisationId: string,
  ): Promise<SearchResultItemDto[]> {
    const results = await this.playlistRepository
      .createQueryBuilder('playlist')
      .where('playlist.organisationId = :orgId', { orgId: organisationId })
      .andWhere('LOWER(playlist.name) LIKE LOWER(:q)', { q: likePattern })
      .take(5)
      .getMany();

    return results.map((p) => ({
      id: p.id,
      type: 'playlist' as const,
      label: p.name,
      url: `/playlists/${p.id}`,
    }));
  }

  private async searchSchedules(
    likePattern: string,
    organisationId: string,
  ): Promise<SearchResultItemDto[]> {
    const results = await this.scheduleEntryRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.playlist', 'playlist')
      .leftJoinAndSelect('schedule.screen', 'screen')
      .leftJoinAndSelect('schedule.group', 'group')
      .where('schedule.organisationId = :orgId', { orgId: organisationId })
      .andWhere(
        '(LOWER(playlist.name) LIKE LOWER(:q) OR LOWER(screen.name) LIKE LOWER(:q) OR LOWER(group.name) LIKE LOWER(:q))',
        { q: likePattern },
      )
      .take(5)
      .getMany();

    return results.map((s) => ({
      id: s.id,
      type: 'schedule' as const,
      label: s.playlist?.name ?? 'Schedule',
      url: `/schedules/${s.id}`,
    }));
  }
}
