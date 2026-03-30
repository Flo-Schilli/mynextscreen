import { validate } from 'class-validator';
import { Playlist } from './playlist.entity';

function createPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  const playlist = new Playlist();
  playlist.organisationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  playlist.name = 'Main Lobby Playlist';
  Object.assign(playlist, overrides);
  return playlist;
}

describe('Playlist entity validation', () => {
  it('should pass validation with valid data', async () => {
    const playlist = createPlaylist();
    const errors = await validate(playlist);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when name is empty', async () => {
    const playlist = createPlaylist({ name: '' });
    const errors = await validate(playlist);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail validation when organisationId is empty', async () => {
    const playlist = createPlaylist({ organisationId: '' });
    const errors = await validate(playlist);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'organisationId')).toBe(true);
  });

  it('should pass validation with a long name', async () => {
    const playlist = createPlaylist({ name: 'A'.repeat(255) });
    const errors = await validate(playlist);
    expect(errors).toHaveLength(0);
  });
});
