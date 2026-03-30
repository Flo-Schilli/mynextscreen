export interface Content {
  id: string;
  organisationId: string;
  title: string;
  description: string | null;
  tags: string[];
  type: 'image' | 'video';
  originalFilename: string;
  originalMimeType: string;
  originalSizeBytes: number;
  transcodedSizeBytes: number | null;
  transcodingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  transcodingError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorageInfo {
  originalUsedBytes: number;
  originalLimitBytes: number;
  transcodedUsedBytes: number;
  transcodedLimitBytes: number;
}
