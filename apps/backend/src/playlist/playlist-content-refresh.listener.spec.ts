import type { EventEmitter2 } from '@nestjs/event-emitter';
import { contents, organisations, playlistItems, playlists } from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import { ContentType } from '../content/content-type.enum';
import { TranscodingCompletedEvent } from '../content/transcoding.event';
import { PLAYLIST_UPDATED, PlaylistUpdatedEvent } from './playlist.event';
import { PlaylistContentRefreshListener } from './playlist-content-refresh.listener';

describe('PlaylistContentRefreshListener', () => {
  let db: DrizzleDB;
  let emit: jest.Mock;
  let listener: PlaylistContentRefreshListener;
  let orgId: string;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    emit = jest.fn();
    listener = new PlaylistContentRefreshListener(db, { emit } as unknown as EventEmitter2);
    const [org] = await db
      .insert(organisations)
      .values({ name: 'Venue', timeZone: 'Europe/Berlin' })
      .returning();
    orgId = org.id;
  });

  async function seedContent(): Promise<string> {
    const [content] = await db
      .insert(contents)
      .values({
        organisationId: orgId,
        title: 'Slide',
        type: ContentType.Image,
        originalFilename: 's.jpg',
        originalMimeType: 'image/jpeg',
        originalSizeBytes: 1,
      })
      .returning();
    return content.id;
  }

  async function seedPlaylist(contentIds: string[]): Promise<string> {
    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId: orgId, name: 'Loop' })
      .returning();
    if (contentIds.length > 0) {
      await db.insert(playlistItems).values(
        contentIds.map((contentId, position) => ({
          playlistId: playlist.id,
          contentId,
          position,
          durationSeconds: 10,
        })),
      );
    }
    return playlist.id;
  }

  it('announces every playlist that shows the freshly transcoded content once', async () => {
    const contentId = await seedContent();
    const twice = await seedPlaylist([contentId, contentId]);
    const once = await seedPlaylist([contentId]);
    await seedPlaylist([await seedContent()]);

    await listener.handleTranscodingCompleted(new TranscodingCompletedEvent(contentId, orgId, 10));

    expect(emit).toHaveBeenCalledTimes(2);
    const announced = emit.mock.calls.map(([name, event]: [string, PlaylistUpdatedEvent]) => {
      expect(name).toBe(PLAYLIST_UPDATED);
      expect(event.organisationId).toBe(orgId);
      return event.playlistId;
    });
    expect(announced.sort()).toEqual([twice, once].sort());
  });

  it('stays quiet for content no playlist uses, like a fresh upload', async () => {
    const contentId = await seedContent();
    await seedPlaylist([]);

    await listener.handleTranscodingCompleted(new TranscodingCompletedEvent(contentId, orgId, 10));

    expect(emit).not.toHaveBeenCalled();
  });

  it('swallows a database error, the screens then refresh on their next push', async () => {
    const broken = {
      selectDistinct: () => {
        throw new Error('db down');
      },
    } as unknown as DrizzleDB;
    listener = new PlaylistContentRefreshListener(broken, { emit } as unknown as EventEmitter2);

    await expect(
      listener.handleTranscodingCompleted(new TranscodingCompletedEvent('c', orgId, 10)),
    ).resolves.toBeUndefined();
    expect(emit).not.toHaveBeenCalled();
  });
});
