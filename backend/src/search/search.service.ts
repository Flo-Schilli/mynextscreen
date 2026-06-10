import { Injectable, Inject } from '@nestjs/common';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screens, contents, playlists, scheduleEntries, screenGroups } from '../db/schema';
import { SearchResultsDto, SearchResultItemDto } from './dto/search-results.dto';

const MAX_RESULTS_PER_TYPE = 5;

@Injectable()
export class SearchService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async search(query: string, organisationId: string): Promise<SearchResultsDto> {
    const trimmed = query.trim();
    if (trimmed === '') {
      return { screens: [], content: [], playlists: [], schedules: [] };
    }

    const sanitised = this.sanitiseLikePattern(trimmed);
    const likePattern = `%${sanitised}%`;

    const [screenResults, contentResults, playlistResults, scheduleResults] = await Promise.all([
      this.searchScreens(likePattern, organisationId),
      this.searchContent(likePattern, organisationId),
      this.searchPlaylists(likePattern, organisationId),
      this.searchSchedules(likePattern, organisationId),
    ]);

    return {
      screens: screenResults,
      content: contentResults,
      playlists: playlistResults,
      schedules: scheduleResults,
    };
  }

  private sanitiseLikePattern(query: string): string {
    return query.replace(/[%_]/g, '\\$&');
  }

  private async searchScreens(
    likePattern: string,
    organisationId: string,
  ): Promise<SearchResultItemDto[]> {
    const results = await this.db
      .select()
      .from(screens)
      .where(
        and(
          eq(screens.organisationId, organisationId),
          or(ilike(screens.name, likePattern), ilike(screens.location, likePattern)),
        ),
      )
      .limit(MAX_RESULTS_PER_TYPE);

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
    const results = await this.db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.organisationId, organisationId),
          or(
            ilike(contents.title, likePattern),
            ilike(contents.description, likePattern),
            sql`${contents.tags}::text ilike ${likePattern}`,
          ),
        ),
      )
      .limit(MAX_RESULTS_PER_TYPE);

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
    const results = await this.db
      .select()
      .from(playlists)
      .where(and(eq(playlists.organisationId, organisationId), ilike(playlists.name, likePattern)))
      .limit(MAX_RESULTS_PER_TYPE);

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
    const results = await this.db
      .select({ id: scheduleEntries.id, playlistName: playlists.name })
      .from(scheduleEntries)
      .leftJoin(playlists, eq(scheduleEntries.playlistId, playlists.id))
      .leftJoin(screens, eq(scheduleEntries.screenId, screens.id))
      .leftJoin(screenGroups, eq(scheduleEntries.groupId, screenGroups.id))
      .where(
        and(
          eq(scheduleEntries.organisationId, organisationId),
          or(
            ilike(playlists.name, likePattern),
            ilike(screens.name, likePattern),
            ilike(screenGroups.name, likePattern),
          ),
        ),
      )
      .limit(MAX_RESULTS_PER_TYPE);

    return results.map((s) => ({
      id: s.id,
      type: 'schedule' as const,
      label: s.playlistName ?? 'Schedule',
      url: `/schedules/${s.id}`,
    }));
  }
}
