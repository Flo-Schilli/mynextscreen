export interface SearchResultItem {
  id: string;
  type: 'screen' | 'content' | 'playlist' | 'schedule';
  label: string;
  url: string;
}

export interface SearchResults {
  screens: SearchResultItem[];
  content: SearchResultItem[];
  playlists: SearchResultItem[];
  schedules: SearchResultItem[];
}
