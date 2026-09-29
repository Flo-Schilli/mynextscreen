import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { PlayerAppsController } from './player-apps.controller';
import { PlayerAppsService, PlayerAppMeta } from './player-apps.service';

describe('PlayerAppsController', () => {
  let controller: PlayerAppsController;
  let playerAppsService: Record<string, jest.Mock>;

  const apps: PlayerAppMeta[] = [{ slug: 'lg-tvos', name: 'LG webOS', downloadAvailable: true }];

  function mockResponse(): Response & { setHeader: jest.Mock; sendFile: jest.Mock } {
    return { setHeader: jest.fn(), sendFile: jest.fn() } as unknown as Response & {
      setHeader: jest.Mock;
      sendFile: jest.Mock;
    };
  }

  beforeEach(async () => {
    playerAppsService = {
      listApps: jest.fn().mockReturnValue(apps),
      getGuideHtml: jest.fn(),
      getBinaryPath: jest.fn(),
      getBinaryFilename: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerAppsController],
      providers: [{ provide: PlayerAppsService, useValue: playerAppsService }],
    }).compile();

    controller = module.get<PlayerAppsController>(PlayerAppsController);
  });

  describe('listApps', () => {
    it('returns the catalogue with its download availability', () => {
      // Act
      const result = controller.listApps();

      // Assert
      expect(result).toEqual(apps);
    });
  });

  describe('getGuide', () => {
    it('returns the rendered guide', async () => {
      // Arrange
      playerAppsService.getGuideHtml.mockResolvedValue('<h1>Install</h1>');

      // Act
      const html = await controller.getGuide('lg-tvos');

      // Assert
      expect(html).toBe('<h1>Install</h1>');
      expect(playerAppsService.getGuideHtml).toHaveBeenCalledWith('lg-tvos');
    });
  });

  describe('downloadBinary', () => {
    it('sends the packaged IPK as an attachment under its real filename', () => {
      // Arrange
      const binPath = '/app/player-applications/lg-tvos/dist/com.mynextscreen.webos_0.11.0_all.ipk';
      playerAppsService.getBinaryPath.mockReturnValue(binPath);
      playerAppsService.getBinaryFilename.mockReturnValue('com.mynextscreen.webos_0.11.0_all.ipk');
      const res = mockResponse();

      // Act
      controller.downloadBinary('lg-tvos', res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="com.mynextscreen.webos_0.11.0_all.ipk"',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
      expect(res.sendFile).toHaveBeenCalledWith(binPath, { root: '/' });
    });

    it('propagates the 404 when no binary was packaged and sends nothing', () => {
      // Arrange
      playerAppsService.getBinaryPath.mockImplementation(() => {
        throw new NotFoundException('Binary for "lg-tvos" not available');
      });
      const res = mockResponse();

      // Act + Assert
      expect(() => controller.downloadBinary('lg-tvos', res)).toThrow(NotFoundException);
      expect(res.sendFile).not.toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalled();
    });
  });
});
