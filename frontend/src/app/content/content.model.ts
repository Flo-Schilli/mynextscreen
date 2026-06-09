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
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorageInfo {
  originalUsedBytes: number;
  originalLimitBytes: number;
  transcodedUsedBytes: number;
  transcodedLimitBytes: number;
}

/** An in-progress (or just-finished) file upload, shown in the upload list. */
export interface UploadItem {
  file: File;
  title: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}
