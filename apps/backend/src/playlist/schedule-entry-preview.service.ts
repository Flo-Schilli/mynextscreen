import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { playlistItems, scheduleEntries } from '../db/schema';
import { PlaylistKind } from './playlist-kind.enum';
import { PlaylistRuleService, type RulePreviewResult } from './playlist-rule.service';

/** One item of a static playlist, as a schedule entry's preview lists it. */
export interface StaticPreviewItem {
  contentId: string;
  title: string;
  contentUpdatedAt: string;
  durationSeconds: number;
}

/**
 * What a schedule entry's playlist shows now. A dynamic one lists the events
 * its rule selects, with their genres; for a genre group that is the narrowed
 * variant the entry plays, which the playlist list never shows.
 */
export type ScheduleEntryPreview =
  | { kind: 'dynamic'; playlistName: string; genres: string[]; result: RulePreviewResult }
  | { kind: 'static'; playlistName: string; items: StaticPreviewItem[] };

@Injectable()
export class ScheduleEntryPreviewService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly rules: PlaylistRuleService,
  ) {}

  async preview(organisationId: string, entryId: string): Promise<ScheduleEntryPreview> {
    const entry = await this.db.query.scheduleEntries.findFirst({
      where: and(
        eq(scheduleEntries.id, entryId),
        eq(scheduleEntries.organisationId, organisationId),
      ),
      with: {
        playlist: {
          with: { items: { with: { content: true }, orderBy: asc(playlistItems.position) } },
        },
      },
    });
    if (!entry) {
      throw new NotFoundException(`Schedule entry with id "${entryId}" not found`);
    }
    const { playlist } = entry;
    if (playlist.kind === PlaylistKind.Dynamic && playlist.rule) {
      return {
        kind: 'dynamic',
        playlistName: playlist.name,
        genres: [...playlist.rule.genres.values],
        result: await this.rules.previewOf(organisationId, playlist.rule),
      };
    }
    return {
      kind: 'static',
      playlistName: playlist.name,
      items: playlist.items.map((item) => ({
        contentId: item.contentId,
        title: item.content.title,
        contentUpdatedAt: item.content.updatedAt.toISOString(),
        durationSeconds: item.durationSeconds,
      })),
    };
  }
}
