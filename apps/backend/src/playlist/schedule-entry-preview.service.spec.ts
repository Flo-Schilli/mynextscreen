import { NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../db/database.constants';
import { Test } from '@nestjs/testing';
import {
  contents,
  organisations,
  playlistItems,
  playlists,
  scheduleEntries,
  screens,
  type Organisation,
  type Playlist,
} from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { TranscodingStatus } from '../content/transcoding-status.enum';
import { TransitionType } from './transition-type.enum';
import { PlaylistKind } from './playlist-kind.enum';
import type { PlaylistRule } from './playlist-rule.types';
import { PlaylistRuleService, type RulePreviewResult } from './playlist-rule.service';
import { ScheduleEntryPreviewService } from './schedule-entry-preview.service';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

const RULE: PlaylistRule = {
  sourceIds: [],
  genres: { match: 'any', values: ['Rock', 'Metal'] },
  venues: [],
  dateFrom: { mode: 'today' },
  dateTo: { mode: 'none' },
  excludeCancelled: true,
  excludeSoldOut: false,
  sort: 'date_asc',
  limit: 10,
  graceHours: 2,
  refreshIntervalMinutes: 60,
  format: '1920x1080',
  itemDurationSeconds: 10,
  transition: TransitionType.Fade,
  transitionDurationMs: 500,
};

describe('ScheduleEntryPreviewService', () => {
  let db: DrizzleDB;
  let service: ScheduleEntryPreviewService;
  let previewOf: jest.Mock;
  let org: Organisation;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    previewOf = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        ScheduleEntryPreviewService,
        { provide: DRIZZLE, useValue: db },
        { provide: PlaylistRuleService, useValue: { previewOf } },
      ],
    }).compile();
    service = module.get(ScheduleEntryPreviewService);
    [org] = await db.insert(organisations).values({ name: 'Venue', timeZone: 'UTC' }).returning();
  });

  async function seedEntry(playlist: Playlist, organisationId = org.id): Promise<string> {
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId,
        name: 'Lobby',
        resolution: '1920x1080',
        location: 'Lobby',
        apiKeyHash: `hash-${Math.random()}`,
      })
      .returning();
    const [entry] = await db
      .insert(scheduleEntries)
      .values({
        organisationId,
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: new Date('2026-11-05T18:00:00Z'),
        endTime: new Date('2026-11-05T19:00:00Z'),
        colour: '#6d6cf6',
      })
      .returning();
    return entry.id;
  }

  it("previews a dynamic playlist's rule, also a hidden genre variant", async () => {
    // Arrange
    const result: RulePreviewResult = { items: [], totalDurationSeconds: 0 };
    previewOf.mockResolvedValue(result);
    const [variant] = await db
      .insert(playlists)
      .values({
        organisationId: org.id,
        name: 'Demnächst · Rock, Metal',
        kind: PlaylistKind.Dynamic,
        rule: RULE,
        variantKey: '["Metal","Rock"]',
      })
      .returning();
    const entryId = await seedEntry(variant);

    // Act
    const preview = await service.preview(org.id, entryId);

    // Assert
    expect(preview).toEqual({
      kind: 'dynamic',
      playlistName: 'Demnächst · Rock, Metal',
      genres: ['Rock', 'Metal'],
      result,
    });
    expect(previewOf).toHaveBeenCalledWith(org.id, expect.objectContaining({ limit: 10 }));
  });

  it('lists the items of a static playlist in order', async () => {
    // Arrange
    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId: org.id, name: 'Loop' })
      .returning();
    const [first, second] = await db
      .insert(contents)
      .values(
        ['Opening', 'Sponsors'].map((title) => ({
          organisationId: org.id,
          title,
          type: ContentType.Image,
          originalFilename: `${title}.png`,
          originalMimeType: 'image/png',
          originalSizeBytes: 100,
          transcodingStatus: TranscodingStatus.Completed,
        })),
      )
      .returning();
    await db.insert(playlistItems).values([
      { playlistId: playlist.id, contentId: second.id, position: 1, durationSeconds: 8 },
      { playlistId: playlist.id, contentId: first.id, position: 0, durationSeconds: 5 },
    ]);
    const entryId = await seedEntry(playlist);

    // Act
    const preview = await service.preview(org.id, entryId);

    // Assert
    expect(preview).toEqual({
      kind: 'static',
      playlistName: 'Loop',
      items: [
        expect.objectContaining({ contentId: first.id, title: 'Opening', durationSeconds: 5 }),
        expect.objectContaining({ contentId: second.id, title: 'Sponsors', durationSeconds: 8 }),
      ],
    });
    expect(previewOf).not.toHaveBeenCalled();
  });

  it("refuses another organisation's entry", async () => {
    // Arrange
    const [other] = await db
      .insert(organisations)
      .values({ name: 'Other', timeZone: 'UTC' })
      .returning();
    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId: other.id, name: 'Theirs' })
      .returning();
    const entryId = await seedEntry(playlist, other.id);

    // Act / Assert
    await expect(service.preview(org.id, entryId)).rejects.toThrow(NotFoundException);
  });
});
