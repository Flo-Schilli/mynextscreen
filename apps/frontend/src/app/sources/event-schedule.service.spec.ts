import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { EventScheduleService } from './event-schedule.service';
import { EventScheduleRuleRequest } from './event-schedule.model';

const ORG_ID = 'org1';
const BASE = '/api/content-sources/s1/event-schedules';

describe('EventScheduleService', () => {
  let service: EventScheduleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(EventScheduleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function expectOne(method: string, url: string) {
    const req = httpMock.expectOne((r) => r.method === method && r.url === url);
    expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
    return req;
  }

  it('lists, creates, updates and deletes rules', () => {
    const dto = { name: 'Rule' } as EventScheduleRuleRequest;

    service.getAll(ORG_ID, 's1').subscribe();
    expectOne('GET', BASE).flush([]);

    service.create(ORG_ID, 's1', dto).subscribe();
    expect(expectOne('POST', BASE).request.body).toEqual(dto);

    service.update(ORG_ID, 's1', 'r1', { enabled: false }).subscribe();
    expect(expectOne('PATCH', `${BASE}/r1`).request.body).toEqual({ enabled: false });

    service.delete(ORG_ID, 's1', 'r1').subscribe();
    expectOne('DELETE', `${BASE}/r1`).flush(null);
  });

  it('loads the preview of a rule', () => {
    service.preview(ORG_ID, 's1', 'r1').subscribe();
    expectOne('GET', `${BASE}/r1/preview`).flush([]);
  });

  it('excludes with PUT and includes with DELETE', () => {
    service.setExcluded(ORG_ID, 's1', 'r1', 'e1', true).subscribe();
    expectOne('PUT', `${BASE}/r1/exclusions/e1`).flush(null);

    service.setExcluded(ORG_ID, 's1', 'r1', 'e1', false).subscribe();
    expectOne('DELETE', `${BASE}/r1/exclusions/e1`).flush(null);
  });
});
