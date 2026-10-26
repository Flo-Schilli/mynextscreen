import { ScreenGroupMode, SliceJobStatus } from '../screen-groups/screen-group.model';

/** Priority of a schedule entry; "high" wins when entries overlap. */
export type SchedulePriority = 'normal' | 'high';

export interface ScheduleEntry {
  id: string;
  organisationId: string;
  screenId: string | null;
  groupId: string | null;
  playlistId: string;
  name: string | null;
  priority: SchedulePriority;
  startTime: string;
  endTime: string;
  rrule: string | null;
  colour: string;
  createdAt: string;
  updatedAt: string;
  playlist?: {
    id: string;
    name: string;
  };
  screen?: {
    id: string;
    name: string;
  };
  group?: {
    id: string;
    name: string;
    mode: ScreenGroupMode;
  };
  /** Split pre-transcoding status for group entries; null/absent when not slicing. */
  sliceStatus?: SliceJobStatus | null;
  /** The event schedule rule that generated the entry; such entries are locked. */
  managedByRule?: { id: string; name: string; sourceId: string } | null;
  /** Set when the entry's event matched one of the rule's genre groups. */
  genreGroup?: ScheduleGenreGroup | null;
}

/** The genre group an entry plays, and the playlist that group narrows. */
export interface ScheduleGenreGroup {
  genres: string[];
  basePlaylistName: string;
}

/**
 * The name the calendar shows for an entry's playlist: a genre group's hidden
 * variant playlist is shown by the name of the playlist it narrows, because the
 * genres appear beside it on their own.
 */
export function entryPlaylistName(entry: ScheduleEntry): string | null {
  return entry.genreGroup?.basePlaylistName || entry.playlist?.name || null;
}

/**
 * What an entry is about, for its headline: the event of a generated entry
 * (its name without the "<rule>: " prefix the rule gives it), a manual entry's
 * own name, or else its playlist.
 */
export function entryTitle(entry: ScheduleEntry): string | null {
  const name = entry.name?.trim();
  if (!name) return entryPlaylistName(entry);
  const rulePrefix = entry.managedByRule ? `${entry.managedByRule.name}: ` : null;
  if (rulePrefix && name.startsWith(rulePrefix) && name.length > rulePrefix.length) {
    return name.slice(rulePrefix.length);
  }
  return name;
}

/** "Rock, Metal" for an entry that plays a genre group, null otherwise. */
export function entryGenres(entry: ScheduleEntry): string | null {
  return entry.genreGroup ? entry.genreGroup.genres.join(', ') : null;
}

export interface CreateScheduleEntryRequest {
  screenId?: string;
  groupId?: string;
  playlistId: string;
  name?: string;
  priority?: SchedulePriority;
  startTime: string;
  endTime: string;
  rrule?: string;
  colour: string;
}

export interface UpdateScheduleEntryRequest {
  playlistId?: string;
  name?: string | null;
  priority?: SchedulePriority;
  startTime?: string;
  endTime?: string;
  rrule?: string | null;
  colour?: string;
}

/** A schedule target shown in the selectors: a single screen or a screen group. */
export interface TargetOption {
  id: string;
  name: string;
  type: 'screen' | 'group';
  mode?: ScreenGroupMode;
}
