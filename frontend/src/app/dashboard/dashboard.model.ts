export interface TimelineEntry {
  playlistName: string;
  colour: string;
  startPercent: number;
  widthPercent: number;
  startTime: string;
  endTime: string;
}

export interface TimelineRow {
  screenName: string;
  entries: TimelineEntry[];
}

export interface ActivityEntry {
  timestamp: string;
  category: 'screen' | 'schedule' | 'transcoding' | 'info';
  description: string;
}
