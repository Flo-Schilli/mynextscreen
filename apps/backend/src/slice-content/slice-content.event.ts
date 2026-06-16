/**
 * Internal events for split-group pre-transcoding (slicing). The dashboard SSE
 * service listens for these and fans them out to the org as `slice.*` messages —
 * the slicing analogue of the `transcoding.*` events in
 * {@link ../content/transcoding.event.ts}.
 */
export const SLICE_PROGRESS = 'slice.progress';
export const SLICE_COMPLETED = 'slice.completed';
export const SLICE_FAILED = 'slice.failed';

export class SliceProgressEvent {
  constructor(
    public readonly organisationId: string,
    public readonly groupId: string,
    public readonly playlistId: string,
    public readonly totalItems: number,
    public readonly completedItems: number,
  ) {}
}

export class SliceCompletedEvent {
  constructor(
    public readonly organisationId: string,
    public readonly groupId: string,
    public readonly playlistId: string,
    public readonly totalItems: number,
  ) {}
}

export class SliceFailedEvent {
  constructor(
    public readonly organisationId: string,
    public readonly groupId: string,
    public readonly playlistId: string,
    public readonly error: string,
  ) {}
}
