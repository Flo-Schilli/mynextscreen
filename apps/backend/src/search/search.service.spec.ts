import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  screens,
  contents,
  playlists,
  scheduleEntries,
  type Organisation,
} from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('SearchService', () => {
  let service: SearchService;
  let db: DrizzleDB;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService, { provide: DRIZZLE, useValue: db }],
    }).compile();
    service = module.get<SearchService>(SearchService);
  });

  async function seedOrg(name: string): Promise<Organisation> {
    const [org] = await db.insert(organisations).values({ name, timeZone: 'UTC' }).returning();
    return org;
  }

  async function seedScreen(
    organisationId: string,
    name: string,
    location = 'Lobby',
  ): Promise<string> {
    const [row] = await db
      .insert(screens)
      .values({
        organisationId,
        name,
        resolution: '1920x1080',
        location,
        apiKeyHash: `hash-${Math.random()}`,
      })
      .returning();
    return row.id;
  }

  async function seedContent(organisationId: string, title: string): Promise<string> {
    const [row] = await db
      .insert(contents)
      .values({
        organisationId,
        title,
        type: ContentType.Image,
        originalFilename: 'file.png',
        originalMimeType: 'image/png',
        originalSizeBytes: 1024,
      })
      .returning();
    return row.id;
  }

  async function seedPlaylist(organisationId: string, name: string): Promise<string> {
    const [row] = await db.insert(playlists).values({ organisationId, name }).returning();
    return row.id;
  }

  async function seedSchedule(
    organisationId: string,
    playlistId: string,
    screenId: string,
  ): Promise<string> {
    const [row] = await db
      .insert(scheduleEntries)
      .values({
        organisationId,
        playlistId,
        screenId,
        startTime: new Date('2026-01-01T08:00:00Z'),
        endTime: new Date('2026-01-01T18:00:00Z'),
        colour: '#ff0000',
      })
      .returning();
    return row.id;
  }

  describe('empty query', () => {
    it('returns empty results for an empty query without hitting the database', async () => {
      const org = await seedOrg('Org A');
      await seedScreen(org.id, 'Lobby Screen');

      const result = await service.search('', org.id);

      expect(result).toEqual({ screens: [], content: [], playlists: [], schedules: [] });
    });

    it('returns empty results for a whitespace-only query', async () => {
      const org = await seedOrg('Org A');
      await seedScreen(org.id, 'Lobby Screen');

      const result = await service.search('   ', org.id);

      expect(result).toEqual({ screens: [], content: [], playlists: [], schedules: [] });
    });
  });

  describe('normal match', () => {
    it('returns categorised results from all entity types', async () => {
      const org = await seedOrg('Org A');
      const screenId = await seedScreen(org.id, 'Morning Lobby Screen');
      const contentId = await seedContent(org.id, 'Morning Welcome Video');
      const playlistId = await seedPlaylist(org.id, 'Morning Playlist');
      const scheduleId = await seedSchedule(org.id, playlistId, screenId);

      const result = await service.search('morning', org.id);

      expect(result.screens).toEqual([
        {
          id: screenId,
          type: 'screen',
          label: 'Morning Lobby Screen',
          url: `/screens/${screenId}`,
        },
      ]);
      expect(result.content).toEqual([
        {
          id: contentId,
          type: 'content',
          label: 'Morning Welcome Video',
          url: `/content/${contentId}`,
        },
      ]);
      expect(result.playlists).toEqual([
        {
          id: playlistId,
          type: 'playlist',
          label: 'Morning Playlist',
          url: `/playlists/${playlistId}`,
        },
      ]);
      expect(result.schedules).toEqual([
        {
          id: scheduleId,
          type: 'schedule',
          label: 'Morning Playlist',
          url: `/schedules/${scheduleId}`,
        },
      ]);
    });

    it('matches screens by location', async () => {
      const org = await seedOrg('Org A');
      const screenId = await seedScreen(org.id, 'Display One', 'Main Entrance');

      const result = await service.search('entrance', org.id);

      expect(result.screens).toEqual([
        { id: screenId, type: 'screen', label: 'Display One', url: `/screens/${screenId}` },
      ]);
    });
  });

  describe('no results', () => {
    it('returns empty arrays when no entities match', async () => {
      const org = await seedOrg('Org A');
      await seedScreen(org.id, 'Lobby Screen');
      await seedContent(org.id, 'Welcome Video');
      await seedPlaylist(org.id, 'Daytime Playlist');

      const result = await service.search('nonexistent', org.id);

      expect(result.screens).toEqual([]);
      expect(result.content).toEqual([]);
      expect(result.playlists).toEqual([]);
      expect(result.schedules).toEqual([]);
    });
  });

  describe('org-scoping', () => {
    it('only returns results from the queried organisation', async () => {
      const orgA = await seedOrg('Org A');
      const orgB = await seedOrg('Org B');
      const screenA = await seedScreen(orgA.id, 'Shared Screen');
      await seedScreen(orgB.id, 'Shared Screen');
      const contentA = await seedContent(orgA.id, 'Shared Content');
      await seedContent(orgB.id, 'Shared Content');
      const playlistA = await seedPlaylist(orgA.id, 'Shared Playlist');
      await seedPlaylist(orgB.id, 'Shared Playlist');

      const result = await service.search('shared', orgA.id);

      expect(result.screens).toEqual([
        { id: screenA, type: 'screen', label: 'Shared Screen', url: `/screens/${screenA}` },
      ]);
      expect(result.content).toEqual([
        { id: contentA, type: 'content', label: 'Shared Content', url: `/content/${contentA}` },
      ]);
      expect(result.playlists).toEqual([
        {
          id: playlistA,
          type: 'playlist',
          label: 'Shared Playlist',
          url: `/playlists/${playlistA}`,
        },
      ]);
    });

    it("does not leak another organisation's data", async () => {
      const orgA = await seedOrg('Org A');
      const orgB = await seedOrg('Org B');
      await seedScreen(orgB.id, 'Secret Screen');
      await seedContent(orgB.id, 'Secret Content');
      await seedPlaylist(orgB.id, 'Secret Playlist');

      const result = await service.search('secret', orgA.id);

      expect(result.screens).toEqual([]);
      expect(result.content).toEqual([]);
      expect(result.playlists).toEqual([]);
      expect(result.schedules).toEqual([]);
    });
  });

  describe('result capping', () => {
    it('returns at most 5 results per entity type', async () => {
      const org = await seedOrg('Org A');
      for (let i = 0; i < 7; i += 1) {
        await seedScreen(org.id, `Lobby Screen ${i}`);
        await seedContent(org.id, `Lobby Content ${i}`);
        await seedPlaylist(org.id, `Lobby Playlist ${i}`);
      }

      const result = await service.search('lobby', org.id);

      expect(result.screens).toHaveLength(5);
      expect(result.content).toHaveLength(5);
      expect(result.playlists).toHaveLength(5);
    });
  });

  describe('LIKE pattern sanitisation', () => {
    it('treats % and _ as literal characters, not wildcards', async () => {
      const org = await seedOrg('Org A');
      const literalId = await seedScreen(org.id, '100%_done');
      await seedScreen(org.id, '100abcdone');

      const result = await service.search('100%_done', org.id);

      expect(result.screens).toEqual([
        { id: literalId, type: 'screen', label: '100%_done', url: `/screens/${literalId}` },
      ]);
    });
  });
});
