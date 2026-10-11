import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddPlaylistItemsDto, MAX_ITEMS_PER_BULK_ADD } from './add-playlist-items.dto';

const CONTENT_ID = '550e8400-e29b-41d4-a716-446655440000';

function toDto(items: unknown[]): AddPlaylistItemsDto {
  return plainToInstance(AddPlaylistItemsDto, { items });
}

describe('AddPlaylistItemsDto', () => {
  it('passes validation for well-formed items', async () => {
    const errors = await validate(
      toDto([{ contentId: CONTENT_ID }, { contentId: CONTENT_ID, durationSeconds: 5 }]),
    );
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty list', async () => {
    const errors = await validate(toDto([]));
    expect(errors[0].constraints).toHaveProperty('arrayMinSize');
  });

  it(`rejects more than ${MAX_ITEMS_PER_BULK_ADD} items`, async () => {
    const items = Array.from({ length: MAX_ITEMS_PER_BULK_ADD + 1 }, () => ({
      contentId: CONTENT_ID,
    }));
    const errors = await validate(toDto(items));
    expect(errors[0].constraints).toHaveProperty('arrayMaxSize');
  });

  it.each([
    [{ contentId: 'not-a-uuid' }],
    [{ contentId: CONTENT_ID, durationSeconds: 0 }],
    [{ contentId: CONTENT_ID, transitionDurationMs: 3001 }],
    [{ contentId: CONTENT_ID, transition: 'spin' }],
  ])('rejects an invalid nested item %j', async (item) => {
    const errors = await validate(toDto([item]));
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('items');
  });
});
