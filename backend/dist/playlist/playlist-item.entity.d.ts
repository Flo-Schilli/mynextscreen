import { Playlist } from './playlist.entity';
import { Content } from '../content/content.entity';
export declare class PlaylistItem {
    id: string;
    playlistId: string;
    playlist: Playlist;
    contentId: string;
    content: Content;
    position: number;
    durationSeconds: number;
}
