import { Organisation } from '../organisation/organisation.entity';
import { PlaylistItem } from './playlist-item.entity';
export declare class Playlist {
    id: string;
    organisationId: string;
    organisation: Organisation;
    name: string;
    items: PlaylistItem[];
    createdAt: Date;
    updatedAt: Date;
}
