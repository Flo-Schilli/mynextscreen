import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentSourceService } from './content-source.service';
import { CreateContentSourceRequest } from './content-source.model';

const ORG_ID = 'org1';

describe('ContentSourceService', () => {
  let service: ContentSourceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ContentSourceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function expectOrgHeader(req: { request: { headers: { get(name: string): string | null } } }) {
    expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
  }

  it('lists the adapters', () => {
    service.getAdapters(ORG_ID).subscribe();
    const req = httpMock.expectOne('/api/content-sources/adapters');
    expectOrgHeader(req);
    req.flush([]);
  });

  it('asks for facets of the given sources as one comma list', () => {
    service.getFacets(ORG_ID, ['a', 'b']).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/content-sources/facets');
    expect(req.request.params.get('sourceIds')).toBe('a,b');
    req.flush({ venues: [], genres: [] });
  });

  it('leaves sourceIds out when no source is given', () => {
    service.getFacets(ORG_ID, []).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/content-sources/facets');
    expect(req.request.params.has('sourceIds')).toBe(false);
    req.flush({ venues: [], genres: [] });
  });

  it('covers the CRUD routes with the org header', () => {
    const dto: CreateContentSourceRequest = {
      name: 'CB',
      adapterType: 'concertbuero-franken',
      params: { monthsAhead: 6 },
      formats: ['1920x1080'],
      style: { background: 'black', accentColor: '#e30613' },
      syncIntervalMinutes: 360,
      enabled: true,
    };
    service.getAll(ORG_ID).subscribe();
    service.getOne(ORG_ID, 's1').subscribe();
    service.create(ORG_ID, dto).subscribe();
    service.update(ORG_ID, 's1', { enabled: false }).subscribe();
    service.delete(ORG_ID, 's1').subscribe();

    const list = httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/content-sources');
    const one = httpMock.expectOne(
      (r) => r.method === 'GET' && r.url === '/api/content-sources/s1',
    );
    const create = httpMock.expectOne(
      (r) => r.method === 'POST' && r.url === '/api/content-sources',
    );
    const update = httpMock.expectOne((r) => r.method === 'PATCH');
    const remove = httpMock.expectOne((r) => r.method === 'DELETE');
    for (const req of [list, one, create, update, remove]) expectOrgHeader(req);
    expect(create.request.body).toEqual(dto);
    expect(update.request.body).toEqual({ enabled: false });
    expect(remove.request.url).toBe('/api/content-sources/s1');
    list.flush([]);
    one.flush({});
    create.flush({});
    update.flush({});
    remove.flush(null);
  });

  it('queues a sync', () => {
    let answer: unknown;
    service.sync(ORG_ID, 's1').subscribe((res) => (answer = res));
    const req = httpMock.expectOne('/api/content-sources/s1/sync');
    expect(req.request.method).toBe('POST');
    req.flush({ queued: true }, { status: 202, statusText: 'Accepted' });
    expect(answer).toEqual({ queued: true });
  });

  it('passes the event filters as query params', () => {
    service
      .getEvents(ORG_ID, 's1', {
        from: '2026-10-01',
        to: '2026-12-31',
        venues: ['Hirsch', 'Z-Bau'],
        genres: ['Metal'],
        includeGone: false,
        limit: 200,
        offset: 0,
      })
      .subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/content-sources/s1/events');
    const params = req.request.params;
    expect(params.get('from')).toBe('2026-10-01');
    expect(params.get('to')).toBe('2026-12-31');
    expect(params.get('venues')).toBe('Hirsch,Z-Bau');
    expect(params.get('genres')).toBe('Metal');
    expect(params.get('includeGone')).toBe('false');
    expect(params.get('limit')).toBe('200');
    expect(params.get('offset')).toBe('0');
    req.flush([]);
  });

  it('sends no event filters that were not set', () => {
    service.getEvents(ORG_ID, 's1').subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/content-sources/s1/events');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });
});
