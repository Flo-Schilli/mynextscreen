import { Test, TestingModule } from '@nestjs/testing';
import { DefaultPlaylistController } from './default-playlist.controller';
import { OrganisationService } from './organisation.service';
import { Organisation } from './organisation.entity';

describe('DefaultPlaylistController', () => {
  let controller: DefaultPlaylistController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const playlistId = '660e8400-e29b-41d4-a716-446655440000';

  const mockOrganisation: Organisation = {
    id: orgId,
    name: 'Test Org',
    timeZone: 'Europe/Vienna',
    storageOriginalLimitBytes: 1073741824,
    storageTranscodedLimitBytes: 2147483648,
    storageOriginalUsedBytes: 0,
    storageTranscodedUsedBytes: 0,
    defaultPlaylistId: playlistId,
    defaultPlaylist: null as unknown,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      setDefaultPlaylist: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DefaultPlaylistController],
      providers: [{ provide: OrganisationService, useValue: service }],
    }).compile();

    controller = module.get<DefaultPlaylistController>(DefaultPlaylistController);
  });

  it('should set the default playlist', async () => {
    service.setDefaultPlaylist.mockResolvedValue(mockOrganisation);

    const result = await controller.setDefaultPlaylist(orgId, {
      playlistId,
    });

    expect(service.setDefaultPlaylist).toHaveBeenCalledWith(orgId, playlistId);
    expect(result).toEqual(mockOrganisation);
  });

  it('should clear the default playlist when playlistId is null', async () => {
    const cleared = { ...mockOrganisation, defaultPlaylistId: null };
    service.setDefaultPlaylist.mockResolvedValue(cleared);

    const result = await controller.setDefaultPlaylist(orgId, {
      playlistId: null,
    });

    expect(service.setDefaultPlaylist).toHaveBeenCalledWith(orgId, null);
    expect(result.defaultPlaylistId).toBeNull();
  });
});
