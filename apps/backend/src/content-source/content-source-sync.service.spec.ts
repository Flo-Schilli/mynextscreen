import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import {
  contentSources,
  contents,
  organisations,
  sourceEventSlides,
  sourceEvents,
  type Content,
  type ContentSource,
} from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import { seedContentSource } from '../test/content-source-seed';
import { ContentService } from '../content/content.service';
import { ContentType } from '../content/content-type.enum';
import {
  AUDIT_CONTENT_SOURCE_SYNC_FAILED,
  AUDIT_CONTENT_SOURCE_SYNCED,
} from '../audit-log/audit.events';
import { ContentSourceAdapterRegistry } from './adapter.registry';
import type {
  ContentSourceAdapter,
  EventDetails,
  EventListing,
  ListedEvent,
  SourceFetcher,
} from './adapters/content-source-adapter.interface';
import { SourceHttpClient } from './source-http.client';
import { SlideRendererService } from './slide/slide-renderer.service';
import {
  ContentSourceSyncService,
  MAX_SUMMARY_ERRORS,
  listingHash,
} from './content-source-sync.service';
import { CONTENT_SOURCE_SYNCED } from './content-source.constants';

const NOW = new Date('2026-11-01T10:00:00Z');

function listed(overrides: Partial<ListedEvent> = {}): ListedEvent {
  return {
    externalId: 'https://cbf.example/asp.html#2026-11-10',
    title: 'ASP',
    eventDate: '2026-11-10',
    startTime: '20:00',
    venue: 'Löwensaal',
    city: 'Nürnberg',
    genres: ['Metal'],
    statusLabels: [],
    cancelled: false,
    soldOut: false,
    notes: [],
    detailUrl: 'https://cbf.example/asp.html',
    ...overrides,
  };
}

const DETAILS: EventDetails = {
  imageUrl: 'https://cbf.example/asp.jpg',
  ticketUrl: 'https://tickets.example/asp',
  priceCents: 5100,
  currency: 'EUR',
};

class FakeAdapter implements ContentSourceAdapter<{ monthsAhead: number }> {
  readonly type = 'fake';
  readonly label = 'Fake';
  readonly allowedHosts = ['cbf.example'];
  readonly paramsSchema = [];
  listing: EventListing = { events: [], listingComplete: true, genresComplete: true, warnings: [] };
  listEvents = jest.fn(async () => this.listing);
  fetchDetails = jest.fn(async (): Promise<EventDetails> => DETAILS);
  validateParams(): { monthsAhead: number } {
    return { monthsAhead: 1 };
  }
}

describe('ContentSourceSyncService', () => {
  let db: DrizzleDB;
  let service: ContentSourceSyncService;
  let adapter: FakeAdapter;
  let fetcher: { getText: jest.Mock; getBuffer: jest.Mock };
  let renderer: { render: jest.Mock };
  let contentService: {
    createManaged: jest.Mock;
    replaceManagedFile: jest.Mock;
    deleteManaged: jest.Mock;
  };
  let emit: jest.Mock;
  let orgId: string;
  let source: ContentSource;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  async function insertManagedContent(
    organisationId: string,
    sourceId: string,
    title: string,
  ): Promise<Content> {
    const [row] = await db
      .insert(contents)
      .values({
        organisationId,
        title,
        type: ContentType.Image,
        originalFilename: 'slide.jpg',
        originalMimeType: 'image/jpeg',
        originalSizeBytes: 3,
        managedBySourceId: sourceId,
      })
      .returning();
    return row;
  }

  beforeEach(async () => {
    await truncateAll();
    adapter = new FakeAdapter();
    fetcher = { getText: jest.fn(), getBuffer: jest.fn().mockResolvedValue(Buffer.from('img')) };
    renderer = { render: jest.fn().mockResolvedValue(Buffer.from('jpg')) };
    contentService = {
      createManaged: jest.fn((org: string, src: string, _b: Buffer, _f: string, title: string) =>
        insertManagedContent(org, src, title),
      ),
      replaceManagedFile: jest.fn(async (_org: string, _src: string, id: string) => {
        const [row] = await db.select().from(contents).where(eq(contents.id, id));
        return row;
      }),
      deleteManaged: jest.fn().mockResolvedValue(undefined),
    };
    emit = jest.fn();
    const registry = { get: jest.fn().mockReturnValue(adapter) };
    const http = { forHosts: jest.fn().mockReturnValue(fetcher as SourceFetcher) };

    service = new ContentSourceSyncService(
      db,
      registry as unknown as ContentSourceAdapterRegistry,
      http as unknown as SourceHttpClient,
      renderer as unknown as SlideRendererService,
      contentService as unknown as ContentService,
      { emit } as unknown as EventEmitter2,
    );

    const [org] = await db
      .insert(organisations)
      .values({ name: 'Venue', timeZone: 'Europe/Berlin' })
      .returning();
    orgId = org.id;
    source = await seedContentSource(db, orgId, {
      adapterType: 'fake',
      formats: ['1920x1080', '1080x1920'],
      syncIntervalMinutes: 60,
    });
  });

  const loadEvents = () =>
    db.select().from(sourceEvents).where(eq(sourceEvents.sourceId, source.id));
  const loadSource = async () =>
    (await db.select().from(contentSources).where(eq(contentSources.id, source.id)))[0];

  it('stores new events with details and renders one slide per format', async () => {
    adapter.listing = { ...adapter.listing, events: [listed()] };

    const summary = await service.sync(source.id, 'user-1', NOW);

    expect(summary).toEqual({
      listed: 1,
      created: 1,
      updated: 0,
      gone: 0,
      rendered: 2,
      failed: 0,
      errors: [],
    });
    const [event] = await loadEvents();
    expect(event).toMatchObject({
      organisationId: orgId,
      title: 'ASP',
      eventDate: '2026-11-10',
      genres: ['Metal'],
      imageUrl: DETAILS.imageUrl,
      ticketUrl: DETAILS.ticketUrl,
      priceCents: 5100,
      dataHash: listingHash(listed()),
      goneAt: null,
    });
    // 20:00 in Berlin (CET) is 19:00 UTC.
    expect(event.startsAt.toISOString()).toBe('2026-11-10T19:00:00.000Z');
    expect(adapter.listEvents).toHaveBeenCalledWith(
      { monthsAhead: 1 },
      expect.objectContaining({ today: '2026-11-01' }),
    );
    expect(fetcher.getBuffer).toHaveBeenCalledTimes(1);
    expect(contentService.createManaged).toHaveBeenCalledWith(
      orgId,
      source.id,
      expect.any(Buffer),
      '2026-11-10_asp_1920x1080.jpg',
      'ASP · Di, 10.11.2026 · Löwensaal',
      ['1920x1080'],
    );
    const slides = await db.select().from(sourceEventSlides);
    expect(slides.map((s) => s.format).sort()).toEqual(['1080x1920', '1920x1080']);
  });

  it('records the outcome on the source and announces it', async () => {
    adapter.listing = { ...adapter.listing, events: [listed()] };

    await service.sync(source.id, 'user-1', NOW);

    const saved = await loadSource();
    expect(saved.lastSyncStatus).toBe('success');
    expect(saved.lastSyncError).toBeNull();
    expect(saved.lastSyncSummary?.rendered).toBe(2);
    expect(saved.nextSyncAt!.getTime() - saved.lastSyncAt!.getTime()).toBe(60 * 60_000);
    expect(emit).toHaveBeenCalledWith(
      AUDIT_CONTENT_SOURCE_SYNCED,
      expect.objectContaining({
        sourceId: source.id,
        userId: 'user-1',
        details: expect.objectContaining({ status: 'success', rendered: 2 }),
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      CONTENT_SOURCE_SYNCED,
      expect.objectContaining({ sourceId: source.id, organisationId: orgId }),
    );
  });

  it('keeps a next sync that was requested while the run was going', async () => {
    const requested = new Date('2026-11-01T10:00:30Z');
    adapter.listEvents.mockImplementationOnce(async () => {
      await db
        .update(contentSources)
        .set({ nextSyncAt: requested })
        .where(eq(contentSources.id, source.id));
      return adapter.listing;
    });

    await service.sync(source.id, null, NOW);

    const saved = await loadSource();
    expect(saved.nextSyncAt).toEqual(requested);
    expect(saved.lastSyncStatus).toBe('success');
  });

  it('skips details and rendering when nothing changed', async () => {
    adapter.listing = { ...adapter.listing, events: [listed()] };
    await service.sync(source.id, null, NOW);
    adapter.fetchDetails.mockClear();
    renderer.render.mockClear();
    fetcher.getBuffer.mockClear();

    const summary = await service.sync(source.id, null, NOW);

    expect(summary).toMatchObject({ created: 0, updated: 0, rendered: 0 });
    expect(adapter.fetchDetails).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
    expect(fetcher.getBuffer).not.toHaveBeenCalled();
  });

  it('refetches details and re-renders in place when the listing changes', async () => {
    adapter.listing = { ...adapter.listing, events: [listed()] };
    await service.sync(source.id, null, NOW);
    const slidesBefore = await db.select().from(sourceEventSlides);
    adapter.listing = {
      ...adapter.listing,
      events: [listed({ soldOut: true, statusLabels: ['AUSVERKAUFT'] })],
    };

    const summary = await service.sync(source.id, null, NOW);

    expect(summary).toMatchObject({ updated: 1, rendered: 2 });
    expect(adapter.fetchDetails).toHaveBeenCalledTimes(2);
    expect(contentService.replaceManagedFile).toHaveBeenCalledTimes(2);
    expect(contentService.createManaged).toHaveBeenCalledTimes(2);
    const slidesAfter = await db.select().from(sourceEventSlides);
    expect(slidesAfter.map((s) => s.contentId).sort()).toEqual(
      slidesBefore.map((s) => s.contentId).sort(),
    );
    expect(slidesAfter[0].renderHash).not.toBe(
      slidesBefore.find((s) => s.format === slidesAfter[0].format)?.renderHash,
    );
  });

  it('marks unlisted events gone and revives them when they come back', async () => {
    const other = listed({ externalId: 'other', title: 'Other' });
    adapter.listing = { ...adapter.listing, events: [listed(), other] };
    await service.sync(source.id, null, NOW);
    const asp = async () => (await loadEvents()).find((e) => e.title === 'ASP')!;

    adapter.listing = { ...adapter.listing, events: [other] };
    const summary = await service.sync(source.id, null, NOW);
    expect(summary?.gone).toBe(1);
    expect((await asp()).goneAt).not.toBeNull();

    adapter.listing = { ...adapter.listing, events: [listed(), other] };
    await service.sync(source.id, null, NOW);
    expect((await asp()).goneAt).toBeNull();
  });

  it('marks nothing gone when a complete listing comes back empty', async () => {
    adapter.listing = { ...adapter.listing, events: [listed()] };
    await service.sync(source.id, null, NOW);

    adapter.listing = { ...adapter.listing, events: [] };
    const summary = await service.sync(source.id, null, NOW);

    expect(summary?.gone).toBe(0);
    expect(summary?.errors).toEqual([
      'Listing shows 0 of 1 current events; nothing was marked gone',
    ]);
    expect((await loadEvents())[0].goneAt).toBeNull();
    expect((await loadSource()).lastSyncStatus).toBe('partial');
  });

  it('marks nothing gone when the listing collapses to under half', async () => {
    adapter.listing = {
      ...adapter.listing,
      events: ['a', 'b', 'c', 'd'].map((id) => listed({ externalId: id, title: id })),
    };
    await service.sync(source.id, null, NOW);

    adapter.listing = { ...adapter.listing, events: [listed({ externalId: 'a', title: 'a' })] };
    const summary = await service.sync(source.id, null, NOW);

    expect(summary?.gone).toBe(0);
    expect((await loadEvents()).every((e) => e.goneAt === null)).toBe(true);
    expect((await loadSource()).lastSyncStatus).toBe('partial');
  });

  it('still marks past events gone that dropped off the listing', async () => {
    adapter.listing = {
      ...adapter.listing,
      events: [listed({ externalId: 'past', eventDate: '2026-10-20' }), listed()],
    };
    await service.sync(source.id, null, NOW);

    adapter.listing = { ...adapter.listing, events: [listed()] };
    const summary = await service.sync(source.id, null, NOW);

    expect(summary?.gone).toBe(1);
    expect(summary?.errors).toEqual([]);
  });

  it('keeps events and merges genres when listing pages failed', async () => {
    adapter.listing = { ...adapter.listing, events: [listed({ genres: ['Metal', 'Rock'] })] };
    await service.sync(source.id, null, NOW);
    adapter.listing = {
      events: [listed({ genres: ['Metal'] })],
      listingComplete: false,
      genresComplete: false,
      warnings: ['Month 202612 could not be loaded: HTTP 503'],
    };
    const other = listed({ externalId: 'other', title: 'Other' });
    await db.insert(sourceEvents).values({
      organisationId: orgId,
      sourceId: source.id,
      externalId: other.externalId,
      title: other.title,
      eventDate: other.eventDate,
      startsAt: NOW,
      venue: other.venue,
      dataHash: 'x',
    });

    const summary = await service.sync(source.id, null, NOW);

    expect(summary?.gone).toBe(0);
    expect(summary?.errors).toContain('Month 202612 could not be loaded: HTTP 503');
    const events = await loadEvents();
    expect(events.every((e) => e.goneAt === null)).toBe(true);
    expect(events.find((e) => e.title === 'ASP')?.genres).toEqual(['Metal', 'Rock']);
    expect((await loadSource()).lastSyncStatus).toBe('partial');
  });

  it('does not render events that are already over', async () => {
    adapter.listing = {
      ...adapter.listing,
      events: [
        listed({ externalId: 'old', eventDate: '2026-10-30' }),
        listed({ externalId: 'yesterday', eventDate: '2026-10-31' }),
      ],
    };

    const summary = await service.sync(source.id, null, NOW);

    expect(summary).toMatchObject({ created: 2, rendered: 2 });
  });

  it('counts a failed detail page and keeps going', async () => {
    adapter.listing = {
      ...adapter.listing,
      events: [listed(), listed({ externalId: 'b', title: 'B' })],
    };
    adapter.fetchDetails.mockRejectedValueOnce(new Error('HTTP 500'));

    const summary = await service.sync(source.id, null, NOW);

    expect(summary?.failed).toBe(1);
    expect(summary?.errors).toEqual(['Details of "ASP": HTTP 500']);
    expect((await loadEvents()).find((e) => e.title === 'ASP')?.imageUrl).toBeNull();
    expect((await loadSource()).lastSyncStatus).toBe('partial');
  });

  it('keeps the old listing hash when the details of a changed event fail', async () => {
    adapter.listing = { ...adapter.listing, events: [listed()] };
    await service.sync(source.id, null, NOW);
    const changed = listed({ soldOut: true, statusLabels: ['AUSVERKAUFT'] });
    adapter.listing = { ...adapter.listing, events: [changed] };
    adapter.fetchDetails.mockRejectedValueOnce(new Error('HTTP 500'));

    await service.sync(source.id, null, NOW);
    expect((await loadEvents())[0]).toMatchObject({
      soldOut: true,
      dataHash: listingHash(listed()),
    });

    adapter.fetchDetails.mockClear();
    adapter.fetchDetails.mockResolvedValueOnce({ ...DETAILS, ticketUrl: 'https://t.example/new' });
    await service.sync(source.id, null, NOW);

    expect(adapter.fetchDetails).toHaveBeenCalledTimes(1);
    expect((await loadEvents())[0]).toMatchObject({
      ticketUrl: 'https://t.example/new',
      dataHash: listingHash(changed),
    });
  });

  it('deletes a new slide content again when its slide row cannot be stored', async () => {
    const orphanId = '00000000-0000-0000-0000-000000000001';
    contentService.createManaged.mockResolvedValue({ id: orphanId });
    adapter.listing = { ...adapter.listing, events: [listed()] };

    const summary = await service.sync(source.id, null, NOW);

    expect(summary).toMatchObject({ rendered: 0, failed: 2 });
    expect(contentService.deleteManaged).toHaveBeenCalledTimes(2);
    expect(contentService.deleteManaged).toHaveBeenCalledWith(orgId, orphanId);
  });

  it('keeps previous slides when the image cannot be downloaded', async () => {
    adapter.listing = { ...adapter.listing, events: [listed()] };
    fetcher.getBuffer.mockRejectedValue(new Error('timeout'));

    const summary = await service.sync(source.id, null, NOW);

    expect(summary).toMatchObject({ rendered: 0, failed: 1 });
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('renders without image when the event has none', async () => {
    adapter.fetchDetails.mockResolvedValue({ ...DETAILS, imageUrl: null });
    adapter.listing = { ...adapter.listing, events: [listed()] };

    await service.sync(source.id, null, NOW);

    expect(fetcher.getBuffer).not.toHaveBeenCalled();
    expect(renderer.render).toHaveBeenCalledWith(
      null,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('counts a failed slide and caps the stored errors', async () => {
    adapter.listing = {
      ...adapter.listing,
      events: Array.from({ length: 15 }, (_, i) => listed({ externalId: `e${i}`, title: `E${i}` })),
    };
    renderer.render.mockRejectedValue(new Error('quota exceeded'));

    const summary = await service.sync(source.id, null, NOW);

    expect(summary?.failed).toBe(30);
    expect(summary?.errors).toHaveLength(MAX_SUMMARY_ERRORS);
  });

  it('records a failed run, audits it and rethrows', async () => {
    adapter.listEvents.mockRejectedValue(new Error('adapter broke'));

    await expect(service.sync(source.id, 'user-1', NOW)).rejects.toThrow('adapter broke');

    const saved = await loadSource();
    expect(saved.lastSyncStatus).toBe('failed');
    expect(saved.lastSyncError).toBe('adapter broke');
    expect(saved.nextSyncAt).not.toBeNull();
    expect(emit).toHaveBeenCalledWith(
      AUDIT_CONTENT_SOURCE_SYNC_FAILED,
      expect.objectContaining({ details: { error: 'adapter broke' } }),
    );
    expect(emit).not.toHaveBeenCalledWith(CONTENT_SOURCE_SYNCED, expect.anything());
  });

  it('returns null for a source that no longer exists', async () => {
    await expect(
      service.sync('00000000-0000-0000-0000-000000000000', null, NOW),
    ).resolves.toBeNull();
  });
});
