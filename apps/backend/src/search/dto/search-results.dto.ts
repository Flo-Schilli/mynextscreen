export class SearchResultItemDto {
  id!: string;
  type!: 'screen' | 'content' | 'playlist' | 'schedule';
  label!: string;
  url!: string;
}

export class SearchResultsDto {
  screens!: SearchResultItemDto[];
  content!: SearchResultItemDto[];
  playlists!: SearchResultItemDto[];
  schedules!: SearchResultItemDto[];
}
