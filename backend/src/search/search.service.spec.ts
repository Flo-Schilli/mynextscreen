import { Repository } from 'typeorm';
import { SearchService } from './search.service';
import { Screen } from '../screen/screen.entity';
import { Content } from '../content/content.entity';
import { Playlist } from '../playlist/playlist.entity';
import { ScheduleEntry } from '../schedule/schedule-entry.entity';

describe('SearchService', () => {
  let service: SearchService;
  let screenRepo: Record<string, jest.Mock>;
  let contentRepo: Record<string, jest.Mock>;
  let playlistRepo: Record<string, jest.Mock>;
  let scheduleRepo: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const otherOrgId = '660e8400-e29b-41d4-a716-446655440000';

  const mockQueryBuilder = () => {
    const qb: Record<string, jest.Mock> = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    return qb;
  };

  beforeEach(() => {
    screenRepo = { createQueryBuilder: jest.fn() };
    contentRepo = { createQueryBuilder: jest.fn() };
    playlistRepo = { createQueryBuilder: jest.fn() };
    scheduleRepo = { createQueryBuilder: jest.fn() };

    service = new SearchService(
      screenRepo as unknown as Repository<Screen>,
      contentRepo as unknown as Repository<Content>,
      playlistRepo as unknown as Repository<Playlist>,
      scheduleRepo as unknown as Repository<ScheduleEntry>,
    );
  });

  describe('empty query', () => {
    it('should return empty results without hitting the database', async () => {
      const result = await service.search('', orgId);

      expect(result).toEqual({
        screens: [],
        content: [],
        playlists: [],
        schedules: [],
      });
      expect(screenRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(contentRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(playlistRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(scheduleRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return empty results for whitespace-only query', async () => {
      const result = await service.search('   ', orgId);

      expect(result).toEqual({
        screens: [],
        content: [],
        playlists: [],
        schedules: [],
      });
      expect(screenRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('normal match', () => {
    it('should return categorised results from all entity types', async () => {
      const screenQb = mockQueryBuilder();
      screenQb.getMany.mockResolvedValue([{ id: 's1', name: 'Lobby Screen', location: 'Lobby' }]);
      screenRepo.createQueryBuilder.mockReturnValue(screenQb);

      const contentQb = mockQueryBuilder();
      contentQb.getMany.mockResolvedValue([
        { id: 'c1', title: 'Welcome Video', description: null, tags: [] },
      ]);
      contentRepo.createQueryBuilder.mockReturnValue(contentQb);

      const playlistQb = mockQueryBuilder();
      playlistQb.getMany.mockResolvedValue([{ id: 'p1', name: 'Morning Playlist' }]);
      playlistRepo.createQueryBuilder.mockReturnValue(playlistQb);

      const scheduleQb = mockQueryBuilder();
      scheduleQb.getMany.mockResolvedValue([{ id: 'se1', playlist: { name: 'Morning Playlist' } }]);
      scheduleRepo.createQueryBuilder.mockReturnValue(scheduleQb);

      const result = await service.search('morning', orgId);

      expect(result.screens).toEqual([
        { id: 's1', type: 'screen', label: 'Lobby Screen', url: '/screens/s1' },
      ]);
      expect(result.content).toEqual([
        {
          id: 'c1',
          type: 'content',
          label: 'Welcome Video',
          url: '/content/c1',
        },
      ]);
      expect(result.playlists).toEqual([
        {
          id: 'p1',
          type: 'playlist',
          label: 'Morning Playlist',
          url: '/playlists/p1',
        },
      ]);
      expect(result.schedules).toEqual([
        {
          id: 'se1',
          type: 'schedule',
          label: 'Morning Playlist',
          url: '/schedules/se1',
        },
      ]);
    });
  });

  describe('no results', () => {
    it('should return empty arrays when no entities match', async () => {
      screenRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());
      contentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());
      playlistRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());
      scheduleRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());

      const result = await service.search('nonexistent', orgId);

      expect(result.screens).toEqual([]);
      expect(result.content).toEqual([]);
      expect(result.playlists).toEqual([]);
      expect(result.schedules).toEqual([]);
    });
  });

  describe('org-scoping', () => {
    it('should pass organisationId to all queries', async () => {
      const screenQb = mockQueryBuilder();
      screenRepo.createQueryBuilder.mockReturnValue(screenQb);

      const contentQb = mockQueryBuilder();
      contentRepo.createQueryBuilder.mockReturnValue(contentQb);

      const playlistQb = mockQueryBuilder();
      playlistRepo.createQueryBuilder.mockReturnValue(playlistQb);

      const scheduleQb = mockQueryBuilder();
      scheduleRepo.createQueryBuilder.mockReturnValue(scheduleQb);

      await service.search('test', orgId);

      expect(screenQb.where).toHaveBeenCalledWith('screen.organisationId = :orgId', { orgId });
      expect(contentQb.where).toHaveBeenCalledWith('content.organisationId = :orgId', { orgId });
      expect(playlistQb.where).toHaveBeenCalledWith('playlist.organisationId = :orgId', { orgId });
      expect(scheduleQb.where).toHaveBeenCalledWith('schedule.organisationId = :orgId', { orgId });
    });

    it('should not return results from another organisation', async () => {
      // All query builders return empty — simulating org-scoped filtering
      screenRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());
      contentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());
      playlistRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());
      scheduleRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());

      const result = await service.search('test', otherOrgId);

      expect(result.screens).toEqual([]);
      expect(result.content).toEqual([]);
      expect(result.playlists).toEqual([]);
      expect(result.schedules).toEqual([]);

      // Verify it was scoped to the other org, not the primary one
      const screenQb = screenRepo.createQueryBuilder.mock.results[0].value;
      expect(screenQb.where).toHaveBeenCalledWith('screen.organisationId = :orgId', {
        orgId: otherOrgId,
      });
    });
  });

  describe('result capping', () => {
    it('should request a maximum of 5 results per entity type', async () => {
      const screenQb = mockQueryBuilder();
      screenRepo.createQueryBuilder.mockReturnValue(screenQb);

      const contentQb = mockQueryBuilder();
      contentRepo.createQueryBuilder.mockReturnValue(contentQb);

      const playlistQb = mockQueryBuilder();
      playlistRepo.createQueryBuilder.mockReturnValue(playlistQb);

      const scheduleQb = mockQueryBuilder();
      scheduleRepo.createQueryBuilder.mockReturnValue(scheduleQb);

      await service.search('test', orgId);

      expect(screenQb.take).toHaveBeenCalledWith(5);
      expect(contentQb.take).toHaveBeenCalledWith(5);
      expect(playlistQb.take).toHaveBeenCalledWith(5);
      expect(scheduleQb.take).toHaveBeenCalledWith(5);
    });
  });

  describe('LIKE pattern sanitisation', () => {
    it('should escape % and _ characters in the query', async () => {
      const screenQb = mockQueryBuilder();
      screenRepo.createQueryBuilder.mockReturnValue(screenQb);
      contentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());
      playlistRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());
      scheduleRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder());

      await service.search('100%_done', orgId);

      expect(screenQb.andWhere).toHaveBeenCalledWith(expect.any(String), {
        q: '%100\\%\\_done%',
      });
    });
  });
});
