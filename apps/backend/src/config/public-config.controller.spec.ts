import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PublicConfigController } from './public-config.controller';

describe('PublicConfigController', () => {
  let get: jest.Mock;

  async function build(): Promise<PublicConfigController> {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicConfigController],
      providers: [{ provide: ConfigService, useValue: { get } }],
    }).compile();
    return module.get(PublicConfigController);
  }

  beforeEach(() => {
    get = jest.fn();
  });

  it('returns the configured PLAYER_BASE_URL', async () => {
    get.mockReturnValue('https://player.example.com');
    const controller = await build();

    expect(controller.getConfig()).toEqual({ playerUrl: 'https://player.example.com' });
  });

  it('reports no player URL when PLAYER_BASE_URL is unset', async () => {
    // Never a stand-in host: this value tells an operator which address to open
    // on a display, and a default would send their screens somewhere else.
    get.mockReturnValue(undefined);
    const controller = await build();

    expect(controller.getConfig()).toEqual({ playerUrl: '' });
  });

  it('treats a blank PLAYER_BASE_URL as unset', async () => {
    get.mockReturnValue('   ');
    const controller = await build();

    expect(controller.getConfig()).toEqual({ playerUrl: '' });
  });
});
