import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchResultsDto } from './dto/search-results.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';

  const mockResults: SearchResultsDto = {
    screens: [
      { id: 's-1', type: 'screen', label: 'Lobby Screen', url: '/screens/s-1' },
    ],
    content: [],
    playlists: [
      {
        id: 'p-1',
        type: 'playlist',
        label: 'Welcome Playlist',
        url: '/playlists/p-1',
      },
    ],
    schedules: [],
  };

  beforeEach(async () => {
    searchService = {
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: searchService }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  describe('GET /search', () => {
    it('should return search results for a valid query', async () => {
      searchService.search.mockResolvedValue(mockResults);

      const query: SearchQueryDto = { q: 'lobby' };
      const result = await controller.search(orgId, query);

      expect(searchService.search).toHaveBeenCalledWith('lobby', orgId);
      expect(result).toEqual(mockResults);
      expect(result.screens).toHaveLength(1);
      expect(result.playlists).toHaveLength(1);
    });

    it('should pass organisationId from decorator to service', async () => {
      const emptyResults: SearchResultsDto = {
        screens: [],
        content: [],
        playlists: [],
        schedules: [],
      };
      searchService.search.mockResolvedValue(emptyResults);

      const differentOrg = '660e8400-e29b-41d4-a716-446655440000';
      await controller.search(differentOrg, { q: 'test' });

      expect(searchService.search).toHaveBeenCalledWith('test', differentOrg);
    });
  });

  describe('SearchQueryDto validation', () => {
    it('should reject when q is missing', async () => {
      const dto = plainToInstance(SearchQueryDto, {});
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const qError = errors.find((e) => e.property === 'q');
      expect(qError).toBeDefined();
    });

    it('should reject when q is shorter than 2 characters', async () => {
      const dto = plainToInstance(SearchQueryDto, { q: 'a' });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const qError = errors.find((e) => e.property === 'q');
      expect(qError).toBeDefined();
      const messages = Object.values(qError!.constraints ?? {});
      expect(messages.some((m) => m.includes('at least 2 characters'))).toBe(
        true,
      );
    });

    it('should accept when q is 2 or more characters', async () => {
      const dto = plainToInstance(SearchQueryDto, { q: 'ab' });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject when q is an empty string', async () => {
      const dto = plainToInstance(SearchQueryDto, { q: '' });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
