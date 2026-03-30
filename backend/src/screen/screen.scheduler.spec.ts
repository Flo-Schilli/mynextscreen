import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScreenScheduler } from './screen.scheduler';
import { ScreenService } from './screen.service';
import { Screen } from './screen.entity';
import { Organisation } from '../organisation/organisation.entity';
import { SCREEN_STATUS_CHANGED } from './screen-status.event';

describe('ScreenScheduler', () => {
  let scheduler: ScreenScheduler;
  let screenService: { detectOfflineScreens: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let configService: { get: jest.Mock };

  const orgId = '550e8400-e29b-41d4-a716-446655440000';

  const makeScreen = (id: string): Screen => ({
    id,
    organisationId: orgId,
    name: `Screen ${id}`,
    resolution: '1920x1080',
    location: 'Test',
    apiKeyHash: '$2b$10$hash',
    lastHeartbeat: new Date(Date.now() - 300_000),
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    organisation: {} as Organisation,
    groupId: null,
    group: null,
    gridRow: null,
    gridColumn: null,
  });

  beforeEach(() => {
    screenService = { detectOfflineScreens: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    configService = { get: jest.fn().mockReturnValue(120_000) };

    scheduler = new ScreenScheduler(
      screenService as unknown as ScreenService,
      eventEmitter as unknown as EventEmitter2,
      configService as unknown as ConfigService,
    );
  });

  it('should detect offline screens and emit events for each', async () => {
    const screens = [makeScreen('aaa-111'), makeScreen('bbb-222')];
    screenService.detectOfflineScreens.mockResolvedValue(screens);

    await scheduler.detectOfflineScreens();

    expect(screenService.detectOfflineScreens).toHaveBeenCalledWith(120_000);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      SCREEN_STATUS_CHANGED,
      expect.objectContaining({
        screenId: 'aaa-111',
        organisationId: orgId,
        isOnline: false,
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      SCREEN_STATUS_CHANGED,
      expect.objectContaining({
        screenId: 'bbb-222',
        organisationId: orgId,
        isOnline: false,
      }),
    );
  });

  it('should not emit events when no screens went offline', async () => {
    screenService.detectOfflineScreens.mockResolvedValue([]);

    await scheduler.detectOfflineScreens();

    expect(screenService.detectOfflineScreens).toHaveBeenCalledWith(120_000);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should use configurable threshold', () => {
    const customConfig = { get: jest.fn().mockReturnValue(60_000) };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = new ScreenScheduler(
      screenService as unknown as ScreenService,
      eventEmitter as unknown as EventEmitter2,
      customConfig as unknown as ConfigService,
    );

    expect(customConfig.get).toHaveBeenCalledWith(
      'SCREEN_OFFLINE_THRESHOLD_MS',
      120_000,
    );
  });
});
