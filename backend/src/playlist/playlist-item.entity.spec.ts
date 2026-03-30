import { validate } from 'class-validator';
import { PlaylistItem } from './playlist-item.entity';
import { TransitionType } from './transition-type.enum';

function createPlaylistItem(
  overrides: Partial<PlaylistItem> = {},
): PlaylistItem {
  const item = new PlaylistItem();
  item.playlistId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  item.contentId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  item.position = 0;
  item.durationSeconds = 10;
  item.transition = TransitionType.Fade;
  item.transitionDurationMs = 500;
  Object.assign(item, overrides);
  return item;
}

describe('PlaylistItem entity validation', () => {
  it('should pass validation with valid data', async () => {
    const item = createPlaylistItem();
    const errors = await validate(item);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when playlistId is empty', async () => {
    const item = createPlaylistItem({ playlistId: '' });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'playlistId')).toBe(true);
  });

  it('should fail validation when contentId is empty', async () => {
    const item = createPlaylistItem({ contentId: '' });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'contentId')).toBe(true);
  });

  it('should fail validation when position is negative', async () => {
    const item = createPlaylistItem({ position: -1 });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'position')).toBe(true);
  });

  it('should pass validation when position is zero', async () => {
    const item = createPlaylistItem({ position: 0 });
    const errors = await validate(item);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when durationSeconds is zero', async () => {
    const item = createPlaylistItem({ durationSeconds: 0 });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'durationSeconds')).toBe(true);
  });

  it('should fail validation when durationSeconds is negative', async () => {
    const item = createPlaylistItem({ durationSeconds: -5 });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'durationSeconds')).toBe(true);
  });

  it('should pass validation with large position value', async () => {
    const item = createPlaylistItem({ position: 999 });
    const errors = await validate(item);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with large durationSeconds', async () => {
    const item = createPlaylistItem({ durationSeconds: 3600 });
    const errors = await validate(item);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when durationSeconds is not an integer', async () => {
    const item = createPlaylistItem({ durationSeconds: 10.5 });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'durationSeconds')).toBe(true);
  });

  it('should pass validation with a valid transition type', async () => {
    const item = createPlaylistItem({ transition: TransitionType.SlideLeft });
    const errors = await validate(item);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with an invalid transition type', async () => {
    const item = createPlaylistItem({
      transition: 'invalid' as TransitionType,
    });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'transition')).toBe(true);
  });

  it('should pass validation when transitionDurationMs is 0', async () => {
    const item = createPlaylistItem({ transitionDurationMs: 0 });
    const errors = await validate(item);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation when transitionDurationMs is 3000', async () => {
    const item = createPlaylistItem({ transitionDurationMs: 3000 });
    const errors = await validate(item);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when transitionDurationMs exceeds 3000', async () => {
    const item = createPlaylistItem({ transitionDurationMs: 3001 });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'transitionDurationMs')).toBe(
      true,
    );
  });

  it('should fail validation when transitionDurationMs is negative', async () => {
    const item = createPlaylistItem({ transitionDurationMs: -1 });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'transitionDurationMs')).toBe(
      true,
    );
  });
});
