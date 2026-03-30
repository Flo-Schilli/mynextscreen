import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LessThan, Repository } from 'typeorm';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { Screen } from './screen.entity';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { generateApiKey, hashApiKey } from './api-key.util';
import {
  ScreenStatusEvent,
  SCREEN_STATUS_CHANGED,
} from './screen-status.event';
import {
  AUDIT_SCREEN_REGISTERED,
  AUDIT_SCREEN_UPDATED,
  AUDIT_SCREEN_KEY_REGENERATED,
  AUDIT_SCREEN_ONLINE,
  AuditScreenEvent,
} from '../audit-log/audit.events';

@Injectable()
export class ScreenService extends OrganisationScopedService<Screen> {
  constructor(
    @InjectRepository(Screen)
    repository: Repository<Screen>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(repository, 'Screen');
  }

  /**
   * Create a new screen with a generated API key.
   * Returns the screen and the plaintext API key (shown only once).
   */
  async createScreen(
    organisationId: string,
    dto: CreateScreenDto,
  ): Promise<{ screen: Screen; apiKey: string }> {
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    const screen = await this.create(organisationId, {
      name: dto.name,
      resolution: dto.resolution,
      location: dto.location,
      apiKeyHash,
    });

    this.eventEmitter.emit(
      AUDIT_SCREEN_REGISTERED,
      new AuditScreenEvent(screen.id, organisationId, null, {
        name: dto.name,
      }),
    );

    return { screen, apiKey };
  }

  /**
   * Update a screen's name, resolution, or location.
   */
  async updateScreen(
    organisationId: string,
    id: string,
    dto: UpdateScreenDto,
  ): Promise<Screen> {
    const screen = await this.update(organisationId, id, dto);
    this.eventEmitter.emit(
      AUDIT_SCREEN_UPDATED,
      new AuditScreenEvent(id, organisationId, null, null),
    );
    return screen;
  }

  /**
   * Regenerate a screen's API key.
   * Returns the screen and the new plaintext API key (shown only once).
   */
  async regenerateApiKey(
    organisationId: string,
    id: string,
  ): Promise<{ screen: Screen; apiKey: string }> {
    const screen = await this.findOne(organisationId, id);
    const apiKey = generateApiKey();
    screen.apiKeyHash = await hashApiKey(apiKey);
    const saved = await this.repository.save(screen);
    this.eventEmitter.emit(
      AUDIT_SCREEN_KEY_REGENERATED,
      new AuditScreenEvent(id, organisationId, null, null),
    );
    return { screen: saved, apiKey };
  }

  /**
   * Record a heartbeat for a screen, marking it as online.
   * Emits a status change event if the screen was previously offline.
   */
  async recordHeartbeat(organisationId: string, id: string): Promise<Screen> {
    const screen = await this.findOne(organisationId, id);
    const wasOffline = !screen.isOnline;
    screen.lastHeartbeat = new Date();
    screen.isOnline = true;
    const saved = await this.repository.save(screen);

    if (wasOffline) {
      this.eventEmitter.emit(
        SCREEN_STATUS_CHANGED,
        new ScreenStatusEvent(saved.id, saved.organisationId, true),
      );
      this.eventEmitter.emit(
        AUDIT_SCREEN_ONLINE,
        new AuditScreenEvent(saved.id, saved.organisationId, null, null),
      );
    }

    return saved;
  }

  /**
   * Detect and mark screens as offline if their last heartbeat
   * is older than the given threshold.
   * Returns the screens that were marked offline.
   */
  async detectOfflineScreens(thresholdMs: number): Promise<Screen[]> {
    const cutoff = new Date(Date.now() - thresholdMs);
    const staleScreens = await this.repository.find({
      where: {
        isOnline: true,
        lastHeartbeat: LessThan(cutoff),
      },
    });

    if (staleScreens.length > 0) {
      await this.repository.update(
        staleScreens.map((s) => s.id),
        { isOnline: false },
      );
    }

    return staleScreens;
  }
}
