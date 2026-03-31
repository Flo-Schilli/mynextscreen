export declare class Organisation {
    id: string;
    name: string;
    timeZone: string;
    storageOriginalLimitBytes: number;
    storageTranscodedLimitBytes: number;
    storageOriginalUsedBytes: number;
    storageTranscodedUsedBytes: number;
    defaultPlaylistId: string | null;
    defaultPlaylist: unknown;
    createdAt: Date;
    updatedAt: Date;
}
