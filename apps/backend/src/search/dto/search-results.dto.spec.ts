import { SearchResultItemDto, SearchResultsDto } from './search-results.dto';

describe('SearchResultItemDto', () => {
  it('should hold all result item fields', () => {
    const item = new SearchResultItemDto();
    item.id = 'abc-123';
    item.type = 'screen';
    item.label = 'Lobby Screen';
    item.url = '/screens/abc-123';

    expect(item.id).toBe('abc-123');
    expect(item.type).toBe('screen');
    expect(item.label).toBe('Lobby Screen');
    expect(item.url).toBe('/screens/abc-123');
  });

  it('should accept all valid type discriminants', () => {
    const types: SearchResultItemDto['type'][] = ['screen', 'content', 'playlist', 'schedule'];
    types.forEach((type) => {
      const item = new SearchResultItemDto();
      item.type = type;
      expect(item.type).toBe(type);
    });
  });
});

describe('SearchResultsDto', () => {
  it('should hold categorised result arrays', () => {
    const screen = new SearchResultItemDto();
    screen.id = 's1';
    screen.type = 'screen';
    screen.label = 'Stage Screen';
    screen.url = '/screens/s1';

    const content = new SearchResultItemDto();
    content.id = 'c1';
    content.type = 'content';
    content.label = 'Welcome Video';
    content.url = '/content/c1';

    const dto = new SearchResultsDto();
    dto.screens = [screen];
    dto.content = [content];
    dto.playlists = [];
    dto.schedules = [];

    expect(dto.screens).toHaveLength(1);
    expect(dto.screens[0].label).toBe('Stage Screen');
    expect(dto.content).toHaveLength(1);
    expect(dto.playlists).toEqual([]);
    expect(dto.schedules).toEqual([]);
  });
});
