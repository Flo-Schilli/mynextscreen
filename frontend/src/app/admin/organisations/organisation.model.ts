export interface Organisation {
  id: string;
  name: string;
  timeZone: string;
  storageOriginalLimitBytes: number;
  storageTranscodedLimitBytes: number;
  storageOriginalUsedBytes: number;
  storageTranscodedUsedBytes: number;
  defaultPlaylistId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganisationDto {
  name: string;
  timeZone: string;
  storageOriginalLimitBytes: number;
  storageTranscodedLimitBytes: number;
}

export interface UpdateOrganisationDto {
  name?: string;
  timeZone?: string;
  storageOriginalLimitBytes?: number;
  storageTranscodedLimitBytes?: number;
}
